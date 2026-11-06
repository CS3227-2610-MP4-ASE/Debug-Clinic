import { createHash } from "node:crypto";
import { QuestionTopicSchema } from "@debugclinic/contracts";

/** Validate before UTF-8 conversion so malformed UTF-16 cannot collide. */
export function generationTopicDigest(topic: string): string {
  return createHash("sha256")
    .update(QuestionTopicSchema.parse(topic), "utf8")
    .digest("hex");
}
