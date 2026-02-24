import { ethers } from "ethers";

const CHAIN_ID = 8453;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_NAME = "USD Coin";
const USDC_VERSION = "2";

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: { name?: string; version?: string };
}

export interface X402Response {
  status: number;
  data: any;
  success: boolean;
}

function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

async function signPayment(
  wallet: ethers.Wallet,
  requirements: PaymentRequirements,
  x402Version: number
): Promise<string> {
  const nonce = generateNonce();
  const nowSec = Math.floor(Date.now() / 1000);
  const validAfter = (nowSec - 600).toString();
  const validBefore = (
    nowSec + (requirements.maxTimeoutSeconds || 900)
  ).toString();

  const domain = {
    name: requirements.extra?.name || USDC_NAME,
    version: requirements.extra?.version || USDC_VERSION,
    chainId: CHAIN_ID,
    verifyingContract: requirements.asset || USDC_ADDRESS,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const value = {
    from: wallet.address,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await wallet.signTypedData(domain, types, value);

  const paymentPayload = {
    x402Version,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      signature,
      authorization: {
        from: wallet.address,
        to: requirements.payTo,
        value: requirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      },
    },
  };

  return Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
}

function parsePaymentRequirements(body: any): {
  requirements: PaymentRequirements;
  x402Version: number;
} {
  if (body.accepts && body.accepts.length > 0) {
    return {
      requirements: body.accepts[0],
      x402Version: body.x402Version || 1,
    };
  }
  throw new Error("No payment requirements in 402 response");
}

export async function x402Request(
  wallet: ethers.Wallet,
  serverUrl: string,
  method: "GET" | "POST",
  endpoint: string,
  body?: any
): Promise<X402Response> {
  const url = `${serverUrl}${endpoint}`;

  const fetchOpts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body && method === "POST") {
    fetchOpts.body = JSON.stringify(body);
  }

  const initial = await fetch(url, fetchOpts);

  if (initial.status !== 402) {
    const data = await initial.json().catch(() => ({ error: "Non-JSON" }));
    return { status: initial.status, data, success: initial.ok };
  }

  const reqBody = await initial.json();
  const { requirements, x402Version } = parsePaymentRequirements(reqBody);
  const paymentHeader = await signPayment(wallet, requirements, x402Version);

  const paidOpts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-PAYMENT": paymentHeader,
    },
  };
  if (body && method === "POST") {
    paidOpts.body = JSON.stringify(body);
  }

  const paid = await fetch(url, paidOpts);
  const data = await paid.json().catch(() => ({ error: "Non-JSON" }));
  return { status: paid.status, data, success: paid.ok };
}
