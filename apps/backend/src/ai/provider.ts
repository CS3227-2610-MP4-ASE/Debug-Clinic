import {
  AiHintResponseSchema,
  type AiHintRequest,
  type AiHintResponse,
  type CurrentUser,
} from "@debugclinic/contracts";

import type { AppConfig } from "../config/env.js";
import { DependencyUnavailableError } from "../lib/errors.js";

export interface AiProviderContext {
  requestId: string;
  user: CurrentUser;
}

export interface AiProvider {
  generateHint(
    input: AiHintRequest,
    context: AiProviderContext,
  ): Promise<unknown>;
}

export class FakeAiProvider implements AiProvider {
  async generateHint(
    input: AiHintRequest,
    context: AiProviderContext,
  ): Promise<AiHintResponse> {
    return Promise.resolve({
      requestId: context.requestId,
      stage: input.stage,
      kind: input.stage === 3 ? "ADVISORY" : "HINT",
      message:
        input.stage === 1
          ? "Trace the values immediately before the failing line and identify the first unexpected state."
          : input.stage === 2
            ? "Compare the variable's intended lifetime with the branch where it is assigned."
            : "Test the smallest change that guarantees the variable is assigned before it is read, then explain why it preserves the intended behavior.",
      promptVersion: "fake-hint-v1",
    });
  }
}

export class SocLlmProvider implements AiProvider {
  constructor(private readonly config: AppConfig) {}

  async generateHint(): Promise<never> {
    void this.config;
    throw new DependencyUnavailableError(
      "The SoC LLM transport is pending the official provider contract and credentials",
    );
  }
}

export function createAiProvider(config: AppConfig): AiProvider {
  return config.aiProvider === "soc"
    ? new SocLlmProvider(config)
    : new FakeAiProvider();
}

export function validateAiResponse(value: unknown): AiHintResponse {
  const parsed = AiHintResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new DependencyUnavailableError(
      "The AI provider returned an invalid response",
    );
  }
  return parsed.data;
}
