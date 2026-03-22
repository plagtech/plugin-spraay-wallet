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

const WalletInfoSchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const walletInfoTemplate = `Extract the wallet address from the user's message.
The user wants to get information about a Spraay agent wallet.

Look for:
- walletAddress: the agent wallet address to query (0x...)

Recent messages:
{{recentMessages}}

Respond with a JSON object containing walletAddress.`;

export const getWalletInfo: Action = {
  name: "GET_WALLET_INFO",
  description:
    "💧 Get information about a Spraay agent wallet — owner, session keys, balance, and label. Costs $0.005 USDC via x402.",
  similes: [
    "SPRAAY_WALLET_INFO",
    "CHECK_AGENT_WALLET",
    "WALLET_STATUS",
    "WALLET_DETAILS",
  ],
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Get info for agent wallet 0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Fetching wallet details from Spraay...",
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
    elizaLogger.info("SPRAAY: Handling GET_WALLET_INFO");

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({ state, template: walletInfoTemplate });

    const params = (
      await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: WalletInfoSchema,
      })
    ).object as z.infer<typeof WalletInfoSchema>;

    const config = validateSpraayEnv(runtime);
    const client = new SpraayGatewayClient(config);

    try {
      const result = await client.getWalletInfo({
        walletAddress: params.walletAddress,
      });

      if (result.success && result.data) {
        const d = result.data;
        const keyList =
          d.sessionKeys.length > 0
            ? d.sessionKeys
                .map(
                  (k) =>
                    `  • \`${k.address}\` — [${k.permissions.join(", ")}] expires ${k.expiresAt}`
                )
                .join("\n")
            : "  None";

        callback?.({
          text: `💧 Wallet Info\n\nAddress: \`${d.walletAddress}\`\nOwner: \`${d.owner}\`\nLabel: ${d.label || "—"}\nBalance: ${d.balance} USDC\n\nSession Keys:\n${keyList}`,
        });
      } else {
        callback?.({ text: `💧 Could not fetch wallet info: ${result.error}` });
      }
    } catch (error) {
      elizaLogger.error("SPRAAY: Wallet info error", error);
      callback?.({
        text: `💧 Error fetching wallet info: ${(error as Error).message}`,
      });
    }
  },
};
