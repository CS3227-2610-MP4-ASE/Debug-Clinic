import {
  coachingSystemPrompt,
  type CoachingProviderInput,
} from "./provider.js";

export type CoachingOutputViolation =
  "prompt-repetition" | "complete-correction";

const zeroWidth = /[\u200B-\u200D\u2060\uFEFF]/gu;
const tokenPattern =
  /[\p{L}_][\p{L}\p{N}_]*|\d+(?:\.\d+)?|(?:\*\*|\/\/|==|!=|<=|>=|\+=|-=|\*=|\/=)|[^\s\p{L}\p{N}_]/gu;
const editIntent = new Set([
  "change",
  "replace",
  "switch",
  "update",
  "set",
  "use",
  "assign",
  "remove",
  "drop",
  "exclude",
  "instead",
  "rather",
]);
const operatorWords: Record<string, string[]> = {
  "+": ["plus", "add", "adding", "increase", "increasing"],
  "-": ["minus", "subtract", "subtracting", "decrease", "decreasing"],
  "*": ["multiply", "multiplying", "times", "product"],
  "/": ["divide", "dividing", "quotient"],
  "+=": ["plus", "add", "adding", "accumulate", "accumulating"],
  "-=": ["minus", "subtract", "subtracting", "decrement", "decrementing"],
  "<": ["less", "below", "exclusive"],
  "<=": ["less", "at", "most", "inclusive"],
};
type ChangedLine = {
  before: string[];
  after: string[];
  beforeOnly: string[];
  afterOnly: string[];
};

function tokens(value: string) {
  return [
    ...value
      .normalize("NFKC")
      .replace(zeroWidth, "")
      .toLowerCase()
      .matchAll(tokenPattern),
  ].map((match) => match[0]);
}

function includesSequence(haystack: string[], needle: string[]) {
  if (!needle.length || needle.length > haystack.length) return false;
  outer: for (
    let index = 0;
    index <= haystack.length - needle.length;
    index++
  ) {
    for (let offset = 0; offset < needle.length; offset++)
      if (haystack[index + offset] !== needle[offset]) continue outer;
    return true;
  }
  return false;
}

export function isPromptDisclosureRequest(value: string) {
  const words = tokens(value);
  const targets = new Set([
    "prompt",
    "instruction",
    "instructions",
    "policy",
    "policies",
    "rules",
  ]);
  const actions = new Set([
    "repeat",
    "quote",
    "reveal",
    "show",
    "print",
    "copy",
    "recite",
    "dump",
    "provide",
    "output",
    "tell",
    "state",
    "verbatim",
  ]);
  const hasTarget =
    words.some((word) => targets.has(word)) ||
    (words.includes("system") && words.includes("developer"));
  if (!hasTarget) return false;
  return words.some(
    (word, index) =>
      actions.has(word) &&
      words
        .slice(Math.max(0, index - 8), index + 9)
        .some((near) => targets.has(near)),
  );
}

function promptShingles(value: string, size = 5) {
  const source = tokens(value).filter((token) => /[\p{L}\p{N}_]/u.test(token));
  const shingles = new Set<string>();
  for (let index = 0; index <= source.length - size; index++)
    shingles.add(source.slice(index, index + size).join(" "));
  return shingles;
}

function repeatsTrustedPrompt(
  transcript: string,
  level: CoachingProviderInput["level"],
) {
  const system = tokens(coachingSystemPrompt(level)).filter((token) =>
    /[\p{L}\p{N}_]/u.test(token),
  );
  const answer = tokens(transcript).filter((token) =>
    /[\p{L}\p{N}_]/u.test(token),
  );
  let longestRun = 0;
  let run = 0;
  for (let index = 0; index < Math.min(system.length, answer.length); index++) {
    if (system[index] === answer[index]) {
      run++;
      longestRun = Math.max(longestRun, run);
    } else run = 0;
  }
  if (longestRun >= 8) return true;

  const trusted = promptShingles(coachingSystemPrompt(level));
  if (!trusted.size) return false;
  const replies = promptShingles(transcript);
  let matches = 0;
  for (const shingle of trusted) if (replies.has(shingle)) matches++;
  return matches / trusted.size >= 0.22;
}

function changedLines(buggyCode: string, correctedSolution: string) {
  const buggy = buggyCode.split(/\r?\n/u);
  const corrected = correctedSolution.split(/\r?\n/u);
  const changes: ChangedLine[] = [];
  for (
    let index = 0;
    index < Math.max(buggy.length, corrected.length);
    index++
  ) {
    const beforeLine = buggy[index] ?? "";
    const afterLine = corrected[index] ?? "";
    if (beforeLine === afterLine) continue;
    const before = tokens(beforeLine);
    const after = tokens(afterLine);
    const beforeOnly = before.filter((token) => !after.includes(token));
    const afterOnly = after.filter((token) => !before.includes(token));
    if (before.length || after.length)
      changes.push({ before, after, beforeOnly, afterOnly });
  }
  return changes;
}

function correctionCodeAppears(
  transcriptTokens: string[],
  changes: ChangedLine[],
) {
  return changes.some(
    (change) =>
      change.after.length && includesSequence(transcriptTokens, change.after),
  );
}

function correctionInstructionAppears(
  transcript: string,
  changes: ChangedLine[],
) {
  const source = tokens(transcript);
  for (let start = 0; start < source.length; start++) {
    if (!editIntent.has(source[start]!)) continue;
    const clause = source.slice(Math.max(0, start - 10), start + 25);
    for (const change of changes) {
      const clauseHas = (tokensToFind: string[]) =>
        tokensToFind.some(
          (token) =>
            clause.includes(token) ||
            (operatorWords[token] ?? []).some((word) => clause.includes(word)),
        );
      const hasBefore = clauseHas(change.beforeOnly);
      const hasAfter = clauseHas(change.afterOnly);
      if (hasBefore && hasAfter) return true;
      if (
        hasBefore &&
        change.afterOnly.length === 0 &&
        change.before.some((token) => clause.includes(token))
      )
        return true;
      const removesSliceBoundary =
        change.before.includes(":") && !change.after.includes(":");
      if (
        removesSliceBoundary &&
        clause.some((token) =>
          ["last", "final", "all", "every"].includes(token),
        ) &&
        clause.some((token) =>
          ["include", "keep", "return", "use", "instead"].includes(token),
        )
      )
        return true;
      if (
        hasBefore &&
        change.afterOnly.length === 0 &&
        change.before.some((token) => clause.includes(token)) &&
        change.before.some((token) => [":", "[", "]"].includes(token)) &&
        clause.some((token) =>
          ["last", "final", "all", "every"].includes(token),
        )
      )
        return true;
    }
  }
  return false;
}

/**
 * This bounded local screen blocks literal prompt replay and code-aligned edit
 * instructions. It is a defense layer, not a semantic proof that arbitrary
 * natural-language advice is safe.
 */
export function coachingOutputViolation(input: {
  message: string;
  level: CoachingProviderInput["level"];
  buggyCode: string;
  correctedSolution: string;
  previousAssistantMessages: string[];
}): CoachingOutputViolation | null {
  const transcript = [...input.previousAssistantMessages, input.message].join(
    " ",
  );
  if (repeatsTrustedPrompt(transcript, input.level)) return "prompt-repetition";

  const changes = changedLines(input.buggyCode, input.correctedSolution);
  const transcriptTokens = tokens(transcript);
  if (
    correctionCodeAppears(transcriptTokens, changes) ||
    correctionInstructionAppears(transcript, changes)
  )
    return "complete-correction";
  return null;
}

export function coachingMessageForProvider(message: string) {
  return isPromptDisclosureRequest(message)
    ? "What should I inspect next in this exercise?"
    : message;
}
