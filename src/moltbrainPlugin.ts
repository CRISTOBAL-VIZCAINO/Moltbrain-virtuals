import {
  GameWorker,
  GameFunction,
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import { ethers } from "ethers";
import { x402Request } from "./x402.js";

const DEFAULT_SERVER_URL = "https://app.moltbrain.dev/api/x402";
const BASE_RPC = "https://mainnet.base.org";

interface MoltBrainPluginOptions {
  id?: string;
  name?: string;
  description?: string;
  privateKey: string;
  serverUrl?: string;
  rpcUrl?: string;
}

class MoltBrainPlugin {
  private id: string;
  private name: string;
  private description: string;
  private wallet: ethers.Wallet;
  private serverUrl: string;

  constructor(options: MoltBrainPluginOptions) {
    this.id = options.id || "moltbrain_worker";
    this.name = options.name || "MoltBrain Memory Worker";
    this.description =
      options.description ||
      "Persistent memory and storage for AI agents via MoltBrain x402 micropayments on Base. " +
        "Can chat with AI, search memories, store/retrieve data, and manage named memory slots.";

    const provider = new ethers.JsonRpcProvider(options.rpcUrl || BASE_RPC);
    this.wallet = new ethers.Wallet(options.privateKey, provider);
    this.serverUrl = options.serverUrl || DEFAULT_SERVER_URL;
  }

  public getWorker(data?: {
    functions?: GameFunction<any>[];
    getEnvironment?: () => Promise<Record<string, string>>;
  }): GameWorker {
    return new GameWorker({
      id: this.id,
      name: this.name,
      description: this.description,
      functions: data?.functions || [
        this.chatFunction,
        this.searchFunction,
        this.storeFunction,
        this.retrieveFunction,
        this.allocateSlotFunction,
        this.writeSlotFunction,
        this.readSlotFunction,
        this.getStatsFunction,
        this.getCapacityFunction,
      ],
      getEnvironment: data?.getEnvironment,
    });
  }

  get chatFunction() {
    return new GameFunction({
      name: "moltbrain_chat",
      description:
        "Chat with MoltBrain AI. Costs $0.01 USDC on Base via x402. " +
        "Use this for general questions, context queries, or agent-to-agent conversation.",
      args: [
        {
          name: "message",
          description: "The message to send to MoltBrain AI",
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.message) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "message is required"
            );
          }
          logger(`Sending chat message to MoltBrain...`);
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "POST",
            "/chat",
            { message: args.message, conversation_history: [] }
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Chat failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            res.data.response || JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Chat error: ${e.message}`
          );
        }
      },
    });
  }

  get searchFunction() {
    return new GameFunction({
      name: "moltbrain_search",
      description:
        "Semantic search across stored memories. Costs $0.01 USDC on Base. " +
        "Returns relevant observations, decisions, and patterns matching the query.",
      args: [
        {
          name: "query",
          description: "The search query for semantic memory search",
        },
        {
          name: "limit",
          description: "Max number of results (default: 10)",
          optional: true,
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.query) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "query is required"
            );
          }
          logger(`Searching MoltBrain memories for: ${args.query}`);
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "POST",
            "/search",
            { query: args.query, limit: parseInt(args.limit || "10") }
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Search failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Search error: ${e.message}`
          );
        }
      },
    });
  }

  get storeFunction() {
    return new GameFunction({
      name: "moltbrain_store",
      description:
        "Store a JSON blob in MoltBrain storage. Content-addressed via SHA-256. " +
        "Costs $0.01 USDC on Base. Returns the hash for later retrieval.",
      args: [
        {
          name: "data",
          description:
            "The data to store (JSON string). Will be content-addressed by SHA-256 hash.",
        },
        {
          name: "key",
          description: "Optional custom key instead of auto-generated hash",
          optional: true,
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.data) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "data is required"
            );
          }
          logger("Storing data in MoltBrain...");
          let parsed: any;
          try {
            parsed = JSON.parse(args.data);
          } catch {
            parsed = args.data;
          }
          const body: any = { data: parsed };
          if (args.key) body.key = args.key;

          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "POST",
            "/store",
            body
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Store failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Store error: ${e.message}`
          );
        }
      },
    });
  }

  get retrieveFunction() {
    return new GameFunction({
      name: "moltbrain_retrieve",
      description:
        "Retrieve a stored blob by its SHA-256 hash. Costs $0.01 USDC on Base.",
      args: [
        {
          name: "hash",
          description: "The SHA-256 hash of the blob to retrieve",
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.hash) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "hash is required"
            );
          }
          logger(`Retrieving blob ${args.hash.slice(0, 16)}...`);
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "GET",
            `/retrieve/${args.hash}`
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Retrieve failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Retrieve error: ${e.message}`
          );
        }
      },
    });
  }

  get allocateSlotFunction() {
    return new GameFunction({
      name: "moltbrain_allocate_slot",
      description:
        "Allocate a named memory slot for persistent key-value storage. " +
        "Costs $0.01 USDC on Base. Returns a slot ID for read/write operations.",
      args: [
        {
          name: "name",
          description:
            "Name for the slot (e.g. 'agent-config', 'session-state')",
        },
        {
          name: "description",
          description: "Optional description of what the slot stores",
          optional: true,
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.name) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "name is required"
            );
          }
          logger(`Allocating slot "${args.name}"...`);
          const body: any = { name: args.name };
          if (args.description) body.description = args.description;

          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "POST",
            "/allocate",
            body
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Allocate failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Allocate error: ${e.message}`
          );
        }
      },
    });
  }

  get writeSlotFunction() {
    return new GameFunction({
      name: "moltbrain_write_slot",
      description:
        "Write data to an allocated memory slot. Costs $0.01 USDC on Base.",
      args: [
        {
          name: "slot_id",
          description: "The slot ID returned from allocate_slot",
        },
        {
          name: "data",
          description: "The data to write (JSON string)",
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.slot_id || !args.data) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "slot_id and data are required"
            );
          }
          logger(`Writing to slot ${args.slot_id}...`);
          let parsed: any;
          try {
            parsed = JSON.parse(args.data);
          } catch {
            parsed = args.data;
          }
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "POST",
            `/slot/${args.slot_id}/write`,
            { data: parsed }
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Write failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Write error: ${e.message}`
          );
        }
      },
    });
  }

  get readSlotFunction() {
    return new GameFunction({
      name: "moltbrain_read_slot",
      description:
        "Read data from an allocated memory slot. Costs $0.01 USDC on Base.",
      args: [
        {
          name: "slot_id",
          description: "The slot ID to read from",
        },
      ] as const,
      executable: async (args, logger) => {
        try {
          if (!args.slot_id) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "slot_id is required"
            );
          }
          logger(`Reading from slot ${args.slot_id}...`);
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "GET",
            `/slot/${args.slot_id}/read`
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Read failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Read error: ${e.message}`
          );
        }
      },
    });
  }

  get getStatsFunction() {
    return new GameFunction({
      name: "moltbrain_stats",
      description:
        "Get memory analytics and usage stats. Costs $0.01 USDC on Base.",
      args: [] as const,
      executable: async (_args, logger) => {
        try {
          logger("Fetching MoltBrain stats...");
          const res = await x402Request(
            this.wallet,
            this.serverUrl,
            "GET",
            "/stats"
          );
          if (!res.success) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Stats failed (${res.status}): ${res.data?.error || "unknown"}`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(res.data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Stats error: ${e.message}`
          );
        }
      },
    });
  }

  get getCapacityFunction() {
    return new GameFunction({
      name: "moltbrain_capacity",
      description:
        "Get node storage capacity info. FREE — no payment required.",
      args: [] as const,
      executable: async (_args, logger) => {
        try {
          logger("Fetching MoltBrain capacity...");
          const url = `${this.serverUrl}/capacity`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          const data = await res.json();
          if (!res.ok) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              `Capacity failed (${res.status})`
            );
          }
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            JSON.stringify(data)
          );
        } catch (e: any) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            `Capacity error: ${e.message}`
          );
        }
      },
    });
  }
}

export default MoltBrainPlugin;
