import { RpcProvider } from "starknet";

export type GravenholdNetwork = {
  accountMode: "local" | "wallet";
  rpcUrl: string;
  chainId: string;
  controllerKeychainUrl?: string;
  profile: "dev" | "slot" | "sepolia" | "mainnet";
  namespace: string;
  worldAddress: string;
  actionsAddress: string;
  slotProject?: string;
  localAccountAddress?: string;
  localPrivateKey?: string;
};

function requiredPublicEnv(name: string, value: string | undefined): string {
  if (typeof value === "undefined" || value === "") {
    throw new Error(
      `Missing ${name}. Run npm run dev:chain before opening the app.`,
    );
  }
  return value;
}

export function getNetwork(): GravenholdNetwork {
  const profile = (import.meta.env.VITE_DOJO_PROFILE ?? "dev") as GravenholdNetwork["profile"];

  return {
    accountMode: (import.meta.env.VITE_ACCOUNT_MODE ??
      (profile === "dev" ? "local" : "wallet")) as GravenholdNetwork["accountMode"],
    actionsAddress: requiredPublicEnv(
      "VITE_DOJO_ACTIONS_ADDRESS",
      import.meta.env.VITE_DOJO_ACTIONS_ADDRESS,
    ),
    chainId: import.meta.env.VITE_STARKNET_CHAIN_ID ?? "KATANA",
    controllerKeychainUrl: import.meta.env.VITE_CONTROLLER_KEYCHAIN_URL,
    localAccountAddress: import.meta.env.VITE_LOCAL_ACCOUNT_ADDRESS,
    localPrivateKey: import.meta.env.VITE_LOCAL_PRIVATE_KEY,
    namespace: import.meta.env.VITE_DOJO_NAMESPACE ?? "gravenhold",
    profile,
    rpcUrl: import.meta.env.VITE_STARKNET_RPC_URL ?? "http://localhost:5050",
    slotProject: import.meta.env.VITE_SLOT_PROJECT,
    worldAddress: requiredPublicEnv(
      "VITE_DOJO_WORLD_ADDRESS",
      import.meta.env.VITE_DOJO_WORLD_ADDRESS,
    ),
  };
}

export function providerForNetwork(network: GravenholdNetwork) {
  return new RpcProvider({ nodeUrl: network.rpcUrl });
}
