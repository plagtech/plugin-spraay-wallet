# 💧 plugin-spraay-wallet

<div align="center">

**Spraay Agent Wallet Plugin for ElizaOS**

Provision smart wallets, manage session keys, and predict wallet addresses on Base — all paid via x402 USDC micropayments.

[![ElizaOS Plugin](https://img.shields.io/badge/ElizaOS-Plugin-blue)](https://elizaos.ai)
[![x402](https://img.shields.io/badge/x402-USDC%20Payments-green)](https://x402.org)
[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF)](https://base.org)

</div>

## Overview

This plugin integrates [Spraay](https://spraay.app)'s Agent Wallet infrastructure with ElizaOS, enabling any AI agent to autonomously deploy and manage smart wallets on Base. Every gateway call is paid with USDC micropayments using the [x402 protocol](https://x402.org) — no API keys, no subscriptions.

## Actions

| Action | Description | Cost |
|--------|-------------|------|
| `PROVISION_AGENT_WALLET` | Deploy a new smart wallet on Base | $0.05 |
| `ADD_SESSION_KEY` | Grant scoped permissions to another address | $0.02 |
| `GET_WALLET_INFO` | Query wallet details, keys, and balance | $0.005 |
| `REVOKE_SESSION_KEY` | Remove a session key's permissions | $0.02 |
| `PREDICT_WALLET_ADDRESS` | Pre-compute a wallet's CREATE2 address | $0.001 |

## Installation

```bash
npm install @elizaos/plugin-spraay-wallet
```

## Configuration

Add to your agent's `.env`:

```env
# Required — private key for signing x402 payments
EVM_PRIVATE_KEY=0x...

# Optional — override gateway URL (default: https://gateway.spraay.app)
SPRAAY_GATEWAY_URL=https://gateway.spraay.app
```

Add to your character config:

```json
{
  "name": "MyAgent",
  "plugins": ["@elizaos/plugin-spraay-wallet"],
  "settings": {
    "plugin-spraay-wallet": {
      "EVM_PRIVATE_KEY": "{{EVM_PRIVATE_KEY}}"
    }
  }
}
```

## Usage

```typescript
import { spraayWalletPlugin } from "@elizaos/plugin-spraay-wallet";

const runtime = await initializeRuntime({
  plugins: [spraayWalletPlugin],
});
```

Then your agent can respond to natural language like:
- *"Create a new agent wallet for 0x1234..."*
- *"Add a session key to my wallet with transfer permissions"*
- *"What's the status of wallet 0xABCD..."*
- *"Revoke the session key 0x5678... from my wallet"*
- *"Predict the wallet address for owner 0x1234..."*

## Contracts (Base Mainnet)

- **Factory:** `0xFBD832Db6D9a05A0434cd497707a1bDC43389CfD`
- **Implementation:** `0x61818Ae8bC161D1884Fd8823985B80e6733C34E7`

## How x402 Works

Every API call to the Spraay gateway requires a signed USDC payment header. The plugin handles this automatically — your agent's `EVM_PRIVATE_KEY` signs a message authorizing the micropayment, and the gateway verifies + settles on Base.

No API keys. No rate limits. Just pay-per-call.

## Links

- [Spraay Gateway Docs](https://docs.spraay.app)
- [x402 Protocol](https://x402.org)
- [npm: spraay-agent-wallet SDK](https://www.npmjs.com/package/spraay-agent-wallet)
- [ElizaOS Docs](https://docs.elizaos.ai)

## License

MIT — built by [@plagtech](https://github.com/plagtech)
