/**
 * Example: Virtuals AI agent with MoltBrain persistent memory
 *
 * This creates a GAME agent that can:
 *  - Chat with MoltBrain AI
 *  - Search memories semantically
 *  - Store and retrieve data blobs
 *  - Allocate / read / write named memory slots
 *  - Check storage capacity
 *
 * Requirements:
 *  - GAME_API_KEY from console.game.virtuals.io
 *  - AGENT_PRIVATE_KEY for a wallet holding USDC on Base
 */

import "dotenv/config";
import { GameAgent } from "@virtuals-protocol/game";
import MoltBrainPlugin from "./moltbrainPlugin.js";

async function main() {
  const gameApiKey = process.env.GAME_API_KEY;
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;

  if (!gameApiKey || !agentPrivateKey) {
    console.error("Set GAME_API_KEY and AGENT_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const moltbrain = new MoltBrainPlugin({
    privateKey: agentPrivateKey,
    serverUrl: process.env.MOLTBRAIN_SERVER_URL,
  });

  const agent = new GameAgent(gameApiKey, {
    name: "MoltBrain Memory Agent",
    goal: "Store and recall information using MoltBrain persistent memory. Use memory search before answering questions to check for relevant context. Store important observations for future sessions.",
    description:
      "An autonomous agent with long-term memory powered by MoltBrain. " +
      "It remembers past interactions across sessions and uses x402 micropayments on Base to access memory endpoints.",
    workers: [moltbrain.getWorker()],
  });

  agent.setLogger((agent, message) => {
    console.log(`[${agent.name}] ${message}`);
  });

  await agent.init();
  console.log("Agent initialized. Running one step...\n");

  await agent.step({
    verbose: true,
  });

  console.log("\nDone.");
}

main().catch(console.error);
