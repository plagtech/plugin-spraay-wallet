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

const SessionKeySchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  sessionKeyAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  permissions: z.array(z.string()).min(1),
  expiresIn: z.number().positive().optional(),
});

const sessionKeyTemplate = `Extract session key parameters from the user's message.
The user wants to add a session key to an existing Spraay agent wallet.

Look for:
- walletAddress: the agent wallet address to add the key to
- sessionKeyAddress: the address to grant session key access
- permissions: array of permissions (e.g. ["transfer", "swap", "approve"])
- expiresIn: optional expiry in seconds

Recent messages:
{{recentMessages}}

Respond with a JSON object.`;

export const addSessionKey: Action = {
  name: "ADD_SESSION_KEY",
  description:
    "💧 Add a session key to an existing Spraay agent wallet. Grants scoped permissions to another address. Costs $0.02 USDC via x402.",
  similes: [
    "CREATE_SESSION_KEY",
    "GRANT_SESSION_KEY",
    "SPRAAY_SESSION_KEY",
    "ADD_WALLET_KEY",
  ],
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Add a session key 0xABCD... to wallet 0x1234... with transfer permissions",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Adding session key with transfer permissions...",
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
    elizaLogger.info("SPRAAY: Handling ADD_SESSION_KEY");

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({ state, template: sessionKeyTemplate });

    const params = (
      await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: SessionKeySchema,
      })
    ).object as z.infer<typeof SessionKeySchema>;

    const config = validateSpraayEnv(runtime);
    const client = new SpraayGatewayClient(config);

    try {
      const result = await client.addSessionKey({
        walletAddress: params.walletAddress,
        sessionKeyAddress: params.sessionKeyAddress,
        permissions: params.permissions,
        expiresIn: params.expiresIn,
      });

      if (result.success && result.data) {
        elizaLogger.success(`SPRAAY: Session key added — ${result.data.sessionKey}`);
        callback?.({
          text: `💧 Session key added!\n\nKey: \`${result.data.sessionKey}\`\nWallet: \`${params.walletAddress}\`\nPermissions: ${params.permissions.join(", ")}\nExpires: ${result.data.expiresAt}\nTx: \`${result.data.txHash}\``,
        });
      } else {
        callback?.({ text: `💧 Failed to add session key: ${result.error}` });
      }
    } catch (error) {
      elizaLogger.error("SPRAAY: Session key error", error);
      callback?.({
        text: `💧 Error adding session key: ${(error as Error).message}`,
      });
    }
  },
};
