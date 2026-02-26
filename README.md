# MoltBrain GAME Plugin

**GAME SDK plugin that gives any Virtuals AI agent persistent long-term memory and storage via MoltBrain x402 micropayments on Base.**

## What it does

This plugin lets Virtuals Protocol AI agents:

- **Chat** with MoltBrain AI for contextual assistance
- **Search** memories semantically across sessions
- **Store** and **retrieve** content-addressed data blobs
- **Allocate**, **write**, and **read** named memory slots
- **Check** storage capacity

Every paid endpoint costs **$0.01 USDC** on Base, settled via the [x402 protocol](https://www.x402.org) (EIP-3009 `TransferWithAuthorization`).

## Quick start

```bash
npm install @moltbrain/game-plugin
```

```typescript
import { GameAgent } from "@virtuals-protocol/game";
import { MoltBrainPlugin } from "@moltbrain/game-plugin";

const moltbrain = new MoltBrainPlugin({
  privateKey: process.env.AGENT_PRIVATE_KEY!, // wallet with USDC on Base
});

const agent = new GameAgent(process.env.GAME_API_KEY!, {
  name: "My Agent",
  goal: "Remember everything across sessions",
  description: "An agent with persistent memory via MoltBrain",
  workers: [moltbrain.getWorker()],
});

await agent.init();
await agent.step({ verbose: true });
```

## Configuration

| Option | Required | Default | Description |
|---|---|---|---|
| `privateKey` | Yes | — | Hex private key for agent wallet (must hold USDC on Base) |
| `serverUrl` | No | `https://app.moltbrain.dev/api/x402` | MoltBrain API URL |
| `rpcUrl` | No | `https://mainnet.base.org` | Base RPC endpoint |
| `id` | No | `moltbrain_worker` | Worker ID |
| `name` | No | `MoltBrain Memory Worker` | Worker display name |
| `description` | No | *(auto)* | Worker description for the GAME planner |

## Available functions

| Function | Cost | Description |
|---|---|---|
| `moltbrain_chat` | $0.01 | Chat with MoltBrain AI |
| `moltbrain_search` | $0.01 | Semantic memory search |
| `moltbrain_store` | $0.01 | Store a JSON blob (content-addressed). Accepts optional `label`. |
| `moltbrain_retrieve` | $0.01 | Retrieve blob by SHA-256 hash |
| `moltbrain_allocate_slot` | $0.01 | Allocate a named memory slot. Accepts optional `label`. |
| `moltbrain_write_slot` | $0.01 | Write data to a slot |
| `moltbrain_read_slot` | $0.01 | Read data from a slot |
| `moltbrain_stats` | $0.01 | Memory analytics |
| `moltbrain_capacity` | FREE | Node storage capacity |

## Vault dapp

Everything your agent stores or allocates shows up in the **MoltBrain Storage** dapp at [app.moltbrain.dev/storage](https://app.moltbrain.dev/storage). Connect the same wallet your agent uses to browse, view, and delete stored data.

Use the optional `label` parameter on `moltbrain_store` and `moltbrain_allocate_slot` to tag items (e.g. `"virtuals_agent"`, `"session_config"`). Labels appear as badges in the vault UI.

## How x402 payments work

1. Agent makes an HTTP request to a MoltBrain endpoint
2. Server responds `402 Payment Required` with USDC payment requirements
3. Plugin signs an EIP-3009 `TransferWithAuthorization` off-chain
4. Request retries with `X-PAYMENT` header containing the signed proof
5. PayAI facilitator verifies and settles the USDC transfer on Base

The agent wallet needs USDC on Base and a small amount of ETH for gas.

## Run the example

```bash
cp .env.example .env
# Fill in GAME_API_KEY and AGENT_PRIVATE_KEY
npm install
npm run example
```

## Links

- [MoltBrain App](https://app.moltbrain.dev)
- [MoltBrain GitHub](https://github.com/nhevers/MoltBrain)
- [Virtuals Protocol](https://virtuals.io)
- [GAME SDK Docs](https://docs.game.virtuals.io)
- [x402 Protocol](https://www.x402.org)

## License

MIT
