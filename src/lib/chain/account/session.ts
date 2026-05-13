import { Account } from "starknet";

import { type GravenholdNetwork, providerForNetwork } from "../networkConfig";
import type { GameSigner } from "../systems";
import { createControllerSession } from "./controllerSession";

export type GameSession =
  | {
      address: string;
      disconnect?: () => Promise<void>;
      kind: "local";
      label: string;
      signer: GameSigner;
    }
  | {
      address: string;
      disconnect?: () => Promise<void>;
      kind: "wallet";
      label: string;
      signer: GameSigner;
    };

export async function createGameSession(network: GravenholdNetwork): Promise<GameSession> {
  if (network.accountMode === "local") {
    return createLocalSession(network);
  }

  return createControllerSession(network);
}

function createLocalSession(network: GravenholdNetwork): GameSession {
  if (!network.localAccountAddress || !network.localPrivateKey) {
    throw new Error("Missing local account env. Run npm run dev:chain before opening the app.");
  }

  return {
    address: network.localAccountAddress,
    kind: "local",
    label: "Local Katana",
    signer: new Account({
      address: network.localAccountAddress,
      provider: providerForNetwork(network),
      signer: network.localPrivateKey,
    }),
  };
}
