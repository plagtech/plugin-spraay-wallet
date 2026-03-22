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

const ProvisionSchema = z.object({
  ownerAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid EVM address"),
  label: z.string().optional(),
});

const provisionTemplate = `Extract the wallet provisioning parameters from the user's message.
The user wants to provision (create/deploy) a new Spraay agent wallet on Base.

Look for:
- ownerAddress: the EVM address that will own the wallet (0x...)
- label: optional name/label for the wallet

Recent messages:
{{recentMessages}}

Respond with a JSON object containing ownerAddress and optionally label.`;

export const provisionAgentWallet: Action = {
  name: "PROVISION_AGENT_WALLET",
  description:
    "💧 Provision (deploy) a new Spraay smart wallet on Base for an AI agent. Costs $0.05 USDC via x402.",
  similes: [
    "CREATE_AGENT_WALLET",
    "DEPLOY_AGENT_WALLET",
    "SPRAAY_PROVISION",
    "NEW_SMART_WALLET",
  ],
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Create a new agent wallet for 0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Provisioning a new Spraay agent wallet on Base for that address...",
        },
      },
    ],
    [
      {
        user: "user",
        content: {
          text: "Deploy a smart wallet labeled 'treasury' for my address 0xABCD...",
        },
      },
      {
        user: "assistant",
        content: {
          text: "💧 Deploying your treasury wallet via Spraay on Base...",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    try {
      validateSpraayEnv(runtime);
      return true;
    } catch {
      elizaLogger.error("SPRAAY: EVM_PRIVATE_KEY not configured");
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
    elizaLogger.info("SPRAAY: Handling PROVISION_AGENT_WALLET");

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({ state, template: provisionTemplate });

    const params = (
      await generateObject({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: ProvisionSchema,
      })
    ).object as z.infer<typeof ProvisionSchema>;

    const config = validateSpraayEnv(runtime);
    const client = new SpraayGatewayClient(config);

    try {
      const result = await client.provision({
        ownerAddress: params.ownerAddress,
        label: params.label,
      });

      if (result.success && result.data) {
        elizaLogger.success(
          `SPRAAY: Wallet provisioned at ${result.data.walletAddress}`
        );
        callback?.({
          text: `💧 Agent wallet provisioned on Base!\n\nWallet: \`${result.data.walletAddress}\`\nTx: \`${result.data.txHash}\`\nOwner: \`${params.ownerAddress}\`${
            params.label ? `\nLabel: ${params.label}` : ""
          }`,
        });
      } else {
        callback?.({
          text: `💧 Wallet provisioning failed: ${result.error}`,
        });
      }
    } catch (error) {
      elizaLogger.error("SPRAAY: Provision error", error);
      callback?.({
        text: `💧 Error provisioning wallet: ${(error as Error).message}`,
      });
    }
  },
};
