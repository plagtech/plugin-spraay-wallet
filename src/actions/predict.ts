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

const PredictSchema = z.object({
  ownerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  salt: z.string().optional(),
});

const predictTemplate = `Extract the address prediction parameters from the user's message.
The user wants to predict (pre-compute) the counterfactual address of a Spraay agent wallet before deploying it.

Look for:
- ownerAddress: the EVM address that would own the wallet (0x...)
- salt: optional salt for CREATE2 address derivation

Recent messages:
{{recentMessages}}

Respond with a JSON object containing ownerAddress and optionally salt.`;

export const predictWalletAddress: Action = {
  name: "PREDICT_WALLET_ADDRESS",
  description:
    "💧 Predict the counterfactual address of a Spraay agent wallet before deploying it. Uses CREATE2 deterministic addressing. Costs $0.001 USDC via x402.",
  similes: [
    "PRECOMPUTE_WALLET_ADDRESS",
    "SPRAAY_PREDICT",
    "CALCULATE_WALLET_ADDRESS",
    "COUNTERFACTUAL_ADDRESS",
  ],
  examples: [
    [
      {
        user: "user",
        content: {
          text: "What address would my agent wallet have? My address is 0x1234...",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Predicting the counterfactual wallet address...",
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
    elizaLogger.info("SPRAAY: Handling PREDICT_WALLET_ADDRESS");

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({ state, template: predictTemplate });

    const params = (
      await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: PredictSchema,
      })
    ).object as z.infer<typeof PredictSchema>;

    const config = validateSpraayEnv(runtime);
    const client = new SpraayGatewayClient(config);

    try {
      const result = await client.predictAddress({
        ownerAddress: params.ownerAddress,
        salt: params.salt,
      });

      if (result.success && result.data) {
        callback?.({
          text: `💧 Predicted Wallet Address\n\nAddress: \`${result.data.predictedAddress}\`\nOwner: \`${result.data.ownerAddress}\`\nSalt: \`${result.data.salt}\`\n\nThis wallet can be deployed later with PROVISION_AGENT_WALLET.`,
        });
      } else {
        callback?.({ text: `💧 Address prediction failed: ${result.error}` });
      }
    } catch (error) {
      elizaLogger.error("SPRAAY: Predict error", error);
      callback?.({
        text: `💧 Error predicting address: ${(error as Error).message}`,
      });
    }
  },
};
