import { DependencyUnavailableError } from "../lib/errors.js";

type Frame = {
  path: (string | number)[];
  kind: "object" | "array";
  key: string;
  expectsKey: boolean;
  index: number;
};

/** Tracks JSON string paths solely to enforce the selected-content byte limit.
 * JSON.parse and the response schemas remain the grammar authorities at EOF. */
export class QuestionContentLimit {
  private readonly frames: Frame[] = [];
  private mode: "outside" | "string" | "primitive" = "outside";
  private keyString = false;
  private selected = false;
  private key = "";
  private escape = false;
  private unicode: string | null = null;
  private bytes = 0;
  private highSurrogate = false;

  consume(text: string): void {
    for (let index = 0; index < text.length; index++) {
      const character = text[index]!;
      if (this.mode === "string") {
        if (this.unicode !== null) {
          if (!/[0-9a-fA-F]/.test(character))
            throw new DependencyUnavailableError();
          this.unicode += character;
          if (this.unicode.length === 4) {
            this.decoded(
              String.fromCharCode(Number.parseInt(this.unicode, 16)),
            );
            this.unicode = null;
          }
        } else if (this.escape) {
          this.escape = false;
          if (character === "u") {
            this.unicode = "";
          } else {
            const escaped: Record<string, string> = {
              '"': '"',
              "\\": "\\",
              "/": "/",
              b: "\b",
              f: "\f",
              n: "\n",
              r: "\r",
              t: "\t",
            };
            const value = escaped[character];
            if (value === undefined) throw new DependencyUnavailableError();
            this.decoded(value);
          }
        } else if (character === "\\") {
          this.escape = true;
        } else if (character === '"') {
          if (this.selected && this.highSurrogate) this.addBytes(3);
          this.highSurrogate = false;
          this.mode = "outside";
          const frame = this.frames.at(-1);
          if (this.keyString && frame) {
            frame.key = this.key;
            frame.expectsKey = false;
          } else {
            this.completeValue();
          }
        } else {
          if (character.charCodeAt(0) < 0x20)
            throw new DependencyUnavailableError();
          this.decoded(character);
        }
        continue;
      }
      if (this.mode === "primitive") {
        if (!/[\s,}\]]/.test(character)) continue;
        this.completeValue();
        this.mode = "outside";
      }
      if (/\s/.test(character) || character === ":") continue;
      const frame = this.frames.at(-1);
      if (character === ",") {
        if (frame?.kind === "object") frame.expectsKey = true;
      } else if (character === "{" || character === "[") {
        this.frames.push({
          path: this.valuePath(),
          kind: character === "{" ? "object" : "array",
          key: "",
          expectsKey: character === "{",
          index: 0,
        });
      } else if (character === "}" || character === "]") {
        this.frames.pop();
        this.completeValue();
      } else if (character === '"') {
        this.mode = "string";
        this.keyString = frame?.kind === "object" && frame.expectsKey;
        this.key = "";
        const path = this.valuePath();
        this.selected =
          !this.keyString &&
          path.length === 4 &&
          path[0] === "choices" &&
          path[1] === 0 &&
          path[2] === "message" &&
          path[3] === "content";
        this.bytes = 0;
        this.highSurrogate = false;
      } else {
        this.mode = "primitive";
      }
    }
  }

  private valuePath(): (string | number)[] {
    const frame = this.frames.at(-1);
    // Deeper paths cannot be the four-segment selected path. Keep memory linear
    // even for a deeply nested, otherwise permitted metadata value.
    if (frame && frame.path.length >= 5) return frame.path;
    return frame
      ? [...frame.path, frame.kind === "array" ? frame.index : frame.key]
      : [];
  }

  private completeValue(): void {
    const frame = this.frames.at(-1);
    if (frame?.kind === "array") frame.index++;
  }

  private decoded(character: string): void {
    if (this.keyString) this.key += character;
    if (!this.selected) return;
    const unit = character.charCodeAt(0);
    if (this.highSurrogate) {
      this.highSurrogate = false;
      if (unit >= 0xdc00 && unit <= 0xdfff) {
        this.addBytes(4);
        return;
      }
      this.addBytes(3);
    }
    if (unit >= 0xd800 && unit <= 0xdbff) {
      this.highSurrogate = true;
      if (this.bytes + 3 > 32_768) throw new DependencyUnavailableError();
    } else {
      this.addBytes(unit < 0x80 ? 1 : unit < 0x800 ? 2 : 3);
    }
  }

  private addBytes(count: number): void {
    this.bytes += count;
    if (this.bytes > 32_768) throw new DependencyUnavailableError();
  }
}
