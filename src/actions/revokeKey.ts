import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  composeContext,
  generateObject,
  ModelClass,
} from "@elizaos/core";
import { z } from "zod";
import { validateSpraayEnv } from "../environment";
import { SpraayGatewayClient } from "../gateway";

const RevokeKeySchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  sessionKeyAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const revokeKeyTemplate = `Extract revocation parameters from the user's message.
The user wants to revoke a session key from a Spraay agent wallet.

Look for:
- walletAddress: the agent wallet that has the session key
- sessionKeyAddress: the session key address to revoke

Recent messages:
{{recentMessages}}

Respond with a JSON object containing walletAddress and sessionKeyAddress.`;

export const revokeSessionKey: Action = {
  name: "REVOKE_SESSION_KEY",
  description:
    "💧 Revoke a session key from a Spraay agent wallet, removing its permissions. Costs $0.02 USDC via x402.",
  similes: [
    "REMOVE_SESSION_KEY",
    "DELETE_SESSION_KEY",
    "SPRAAY_REVOKE_KEY",
    "DISABLE_SESSION_KEY",
  ],
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Revoke session key 0xABCD... from wallet 0x1234...",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Revoking that session key from the wallet...",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    try {
      validateSpraayEnv(runtime);
      return true;
    } catch {
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void> => {
    elizaLogger.info("SPRAAY: Handling REVOKE_SESSION_KEY");

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({ state, template: revokeKeyTemplate });

    const params = (
      await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: RevokeKeySchema,
      })
    ).object as z.infer<typeof RevokeKeySchema>;

    const config = validateSpraayEnv(runtime);
    const client = new SpraayGatewayClient(config);

    try {
      const result = await client.revokeKey({
        walletAddress: params.walletAddress,
        sessionKeyAddress: params.sessionKeyAddress,
      });

      if (result.success && result.data) {
        elizaLogger.success(`SPRAAY: Key revoked — ${result.data.revokedKey}`);
        callback?.({
          text: `💧 Session key revoked!\n\nRevoked: \`${result.data.revokedKey}\`\nWallet: \`${params.walletAddress}\`\nTx: \`${result.data.txHash}\``,
        });
      } else {
        callback?.({ text: `💧 Failed to revoke key: ${result.error}` });
      }
    } catch (error) {
      elizaLogger.error("SPRAAY: Revoke key error", error);
      callback?.({
        text: `💧 Error revoking key: ${(error as Error).message}`,
      });
    }
  },
};
