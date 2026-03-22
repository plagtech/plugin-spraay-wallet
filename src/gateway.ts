import { ethers } from "ethers";
import type { SpraayEnvConfig } from "./environment";

/**
 * 💧 Spraay Gateway Client
 *
 * Handles x402 payment header generation and HTTP calls to:
 *   POST /api/v1/agent-wallet/provision     ($0.05)
 *   POST /api/v1/agent-wallet/session-key   ($0.02)
 *   GET  /api/v1/agent-wallet/info          ($0.005)
 *   POST /api/v1/agent-wallet/revoke-key    ($0.02)
 *   GET  /api/v1/agent-wallet/predict        ($0.001)
 */

// USDC on Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SPRAAY_PAYMENT_ADDRESS = "0xAd62f03C7514bb8c51f1eA70C2b75C37404695c8";

interface X402PaymentHeader {
  "X-PAYMENT": string;
}

export interface ProvisionParams {
  ownerAddress: string;
  label?: string;
}

export interface SessionKeyParams {
  walletAddress: string;
  sessionKeyAddress: string;
  permissions: string[];
  expiresIn?: number; // seconds
}

export interface WalletInfoParams {
  walletAddress: string;
}

export interface RevokeKeyParams {
  walletAddress: string;
  sessionKeyAddress: string;
}

export interface PredictParams {
  ownerAddress: string;
  salt?: string;
}

export interface GatewayResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SpraayGatewayClient {
  private wallet: ethers.Wallet;
  private baseUrl: string;

  constructor(config: SpraayEnvConfig) {
    const key = config.EVM_PRIVATE_KEY.startsWith("0x")
      ? config.EVM_PRIVATE_KEY
      : `0x${config.EVM_PRIVATE_KEY}`;
    this.wallet = new ethers.Wallet(key);
    this.baseUrl = config.SPRAAY_GATEWAY_URL;
  }

  /**
   * Generate an x402 payment header.
   * Signs a typed message authorizing USDC payment on Base.
   */
  private async generatePaymentHeader(
    amountUsd: number
  ): Promise<X402PaymentHeader> {
    const payload = {
      amount: amountUsd.toString(),
      token: USDC_BASE,
      recipient: SPRAAY_PAYMENT_ADDRESS,
      chain: "base",
      timestamp: Date.now(),
    };

    const message = JSON.stringify(payload);
    const signature = await this.wallet.signMessage(message);

    const header = Buffer.from(
      JSON.stringify({ ...payload, signature })
    ).toString("base64");

    return { "X-PAYMENT": header };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    costUsd: number,
    body?: Record<string, unknown>
  ): Promise<GatewayResponse<T>> {
    const paymentHeader = await this.generatePaymentHeader(costUsd);

    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...paymentHeader,
      },
    };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return { success: true, data: data as T };
  }

  // ── Endpoint Wrappers ──────────────────────────────────────────

  async provision(params: ProvisionParams) {
    return this.request<{
      walletAddress: string;
      txHash: string;
    }>("POST", "/api/v1/agent-wallet/provision", 0.05, {
      ownerAddress: params.ownerAddress,
      label: params.label,
    });
  }

  async addSessionKey(params: SessionKeyParams) {
    return this.request<{
      txHash: string;
      sessionKey: string;
      expiresAt: string;
    }>("POST", "/api/v1/agent-wallet/session-key", 0.02, {
      walletAddress: params.walletAddress,
      sessionKeyAddress: params.sessionKeyAddress,
      permissions: params.permissions,
      expiresIn: params.expiresIn,
    });
  }

  async getWalletInfo(params: WalletInfoParams) {
    return this.request<{
      walletAddress: string;
      owner: string;
      sessionKeys: Array<{
        address: string;
        permissions: string[];
        expiresAt: string;
      }>;
      balance: string;
      label: string;
    }>(
      "GET",
      `/api/v1/agent-wallet/info?walletAddress=${params.walletAddress}`,
      0.005
    );
  }

  async revokeKey(params: RevokeKeyParams) {
    return this.request<{
      txHash: string;
      revokedKey: string;
    }>("POST", "/api/v1/agent-wallet/revoke-key", 0.02, {
      walletAddress: params.walletAddress,
      sessionKeyAddress: params.sessionKeyAddress,
    });
  }

  async predictAddress(params: PredictParams) {
    return this.request<{
      predictedAddress: string;
      ownerAddress: string;
      salt: string;
    }>(
      "GET",
      `/api/v1/agent-wallet/predict?ownerAddress=${params.ownerAddress}${
        params.salt ? `&salt=${params.salt}` : ""
      }`,
      0.001
    );
  }
}
