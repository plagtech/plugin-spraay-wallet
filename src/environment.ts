import { z } from "zod";
import type { IAgentRuntime } from "@elizaos/core";

/**
 * 💧 Spraay Agent Wallet — Environment Configuration
 *
 * Required:
 *   EVM_PRIVATE_KEY — Private key for signing x402 USDC payments on Base
 *
 * Optional:
 *   SPRAAY_GATEWAY_URL — Override default gateway (https://gateway.spraay.app)
 */

export const spraayEnvSchema = z.object({
  EVM_PRIVATE_KEY: z
    .string()
    .min(1, "EVM_PRIVATE_KEY is required for x402 payments")
    .refine(
      (key) => /^(0x)?[0-9a-fA-F]{64}$/.test(key),
      "EVM_PRIVATE_KEY must be a valid 64-character hex private key"
    ),
  SPRAAY_GATEWAY_URL: z
    .string()
    .url()
    .default("https://gateway.spraay.app"),
});

export type SpraayEnvConfig = z.infer<typeof spraayEnvSchema>;

/**
 * Validate and extract Spraay environment config from the ElizaOS runtime.
 * Throws a descriptive ZodError if EVM_PRIVATE_KEY is missing or invalid.
 */
export function validateSpraayEnv(runtime: IAgentRuntime): SpraayEnvConfig {
  const raw = {
    EVM_PRIVATE_KEY:
      runtime.getSetting("EVM_PRIVATE_KEY") ??
      process.env.EVM_PRIVATE_KEY,
    SPRAAY_GATEWAY_URL:
      runtime.getSetting("SPRAAY_GATEWAY_URL") ??
      process.env.SPRAAY_GATEWAY_URL ??
      "https://gateway.spraay.app",
  };

  return spraayEnvSchema.parse(raw);
}
