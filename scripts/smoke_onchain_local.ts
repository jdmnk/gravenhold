import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Account, CallData, RpcProvider } from "starknet";

const root = resolve(__dirname, "..");
const env = readLocalEnv(resolve(root, ".env.local"));

const rpcUrl = env.VITE_STARKNET_RPC_URL ?? "http://localhost:5050";
const actionsAddress = requiredEnv("VITE_DOJO_ACTIONS_ADDRESS", env.VITE_DOJO_ACTIONS_ADDRESS);
const accountAddress = requiredEnv("VITE_LOCAL_ACCOUNT_ADDRESS", env.VITE_LOCAL_ACCOUNT_ADDRESS);
const privateKey = requiredEnv("VITE_LOCAL_PRIVATE_KEY", env.VITE_LOCAL_PRIVATE_KEY);
const seed = process.argv[2] ?? `smoke-${Date.now()}`;

const provider = new RpcProvider({ nodeUrl: rpcUrl });
const account = new Account({
  address: accountAddress,
  provider,
  signer: privateKey,
});

const tx = await account.execute([
  {
    calldata: CallData.compile([seedToFelt(seed), 0]),
    contractAddress: actionsAddress,
    entrypoint: "start_run",
  },
]);

await provider.waitForTransaction(tx.transaction_hash, { retryInterval: 1000 });

const runId = await callFirstFelt("active_run_id", [accountAddress]);
const run = await provider.callContract({
  calldata: CallData.compile([runId]),
  contractAddress: actionsAddress,
  entrypoint: "get_run",
});

console.log(`Started local onchain run for seed "${seed}".`);
console.log(`tx:     ${tx.transaction_hash}`);
console.log(`run_id: ${runId.toString()}`);
console.log(`level:  ${Number(BigInt(run[7] ?? "0"))}`);
console.log(`phase:  ${Number(BigInt(run[5] ?? "0"))}`);

async function callFirstFelt(entrypoint: string, calldata: Array<string | number | bigint>) {
  const result = await provider.callContract({
    calldata: CallData.compile(calldata),
    contractAddress: actionsAddress,
    entrypoint,
  });
  return BigInt(result[0] ?? "0");
}

function readLocalEnv(path: string): Record<string, string> {
  if (!existsSync(path)) {
    throw new Error("Missing .env.local. Run npm run dev:chain first.");
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function requiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Run npm run dev:chain first.`);
  }
  return value;
}

function seedToFelt(value: string): bigint {
  let hash = BigInt(2166136261);
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * BigInt(16777619)) & BigInt(0xffffffff);
  }
  return hash === BigInt(0) ? BigInt(1) : hash;
}
