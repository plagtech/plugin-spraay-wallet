import type { Plugin } from "@elizaos/core";
import {
  provisionAgentWallet,
  addSessionKey,
  getWalletInfo,
  revokeSessionKey,
  predictWalletAddress,
} from "./actions";

/**
 * 💧 Spraay Agent Wallet Plugin for ElizaOS
 *
 * Enables AI agents to provision smart wallets, manage session keys,
 * and predict wallet addresses on Base via x402 USDC micropayments.
 *
 * Gateway: https://gateway.spraay.app
 * Contracts: Base mainnet
 *   Factory: 0xFBD832Db6D9a05A0434cd497707a1bDC43389CfD
 *   Implementation: 0x61818Ae8bC161D1884Fd8823985B80e6733C34E7
 *
 * Endpoints (x402 pricing):
 *   POST /api/v1/agent-wallet/provision     $0.05
 *   POST /api/v1/agent-wallet/session-key   $0.02
 *   GET  /api/v1/agent-wallet/info          $0.005
 *   POST /api/v1/agent-wallet/revoke-key    $0.02
 *   GET  /api/v1/agent-wallet/predict       $0.001
 *
 * Required env: EVM_PRIVATE_KEY
 * Optional env: SPRAAY_GATEWAY_URL
 */
export const spraayWalletPlugin: Plugin = {
  name: "@elizaos/plugin-spraay-wallet",
  description:
    "💧 Spraay Agent Wallet — provision smart wallets, manage session keys, and predict addresses on Base via x402 micropayments",
  actions: [
    provisionAgentWallet,
    addSessionKey,
    getWalletInfo,
    revokeSessionKey,
    predictWalletAddress,
  ],
  providers: [],
  evaluators: [],
};

// Default export for dynamic plugin loading
export default spraayWalletPlugin;

// Named exports for direct imports
export {
  provisionAgentWallet,
  addSessionKey,
  getWalletInfo,
  revokeSessionKey,
  predictWalletAddress,
};
export { validateSpraayEnv, spraayEnvSchema } from "./environment";
export { SpraayGatewayClient } from "./gateway";
export type {
  ProvisionParams,
  SessionKeyParams,
  WalletInfoParams,
  RevokeKeyParams,
  PredictParams,
  GatewayResponse,
} from "./gateway";
