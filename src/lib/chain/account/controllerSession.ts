import type {
  AuthOptions,
  ControllerOptions,
  SessionPolicies,
} from "@cartridge/controller";

import type { GravenholdNetwork } from "../networkConfig";
import type { GameSession } from "./session";
import type { GameSigner } from "../systems";

type ControllerAccount = {
  address: string;
  execute: GameSigner["execute"];
};

export async function createControllerSession(network: GravenholdNetwork): Promise<GameSession> {
  const { default: Controller } = await import("@cartridge/controller");
  const options: ControllerOptions = {
    chains: [{ rpcUrl: network.rpcUrl }],
    defaultChainId: controllerChainId(network.chainId) as ControllerOptions["defaultChainId"],
    errorDisplayMode: "modal",
    lazyload: true,
    namespace: network.namespace,
    policies: gravenholdSessionPolicies(network),
    propagateSessionErrors: true,
    signupOptions: walletSignupOptions(),
  };

  if (network.controllerKeychainUrl) {
    options.url = network.controllerKeychainUrl;
  }

  if (network.slotProject) {
    options.slot = network.slotProject;
  }

  const controller = new Controller(options);
  const account = await controller.connect();

  if (!account) {
    throw new Error("Cartridge connection was cancelled.");
  }

  return {
    address: account.address,
    disconnect: () => controller.disconnect(),
    kind: "wallet",
    label: "Cartridge",
    signer: wrapControllerAccount(account as ControllerAccount),
  };
}

function gravenholdSessionPolicies(network: GravenholdNetwork): SessionPolicies {
  return {
    contracts: {
      [network.actionsAddress]: {
        description: "Gravenhold game actions",
        methods: [
          {
            description: "Start a new Gravenhold run.",
            entrypoint: "start_run",
            name: "Start Run",
          },
          {
            description: "Choose a stat option for the current encounter.",
            entrypoint: "choose_option",
            name: "Choose Option",
          },
          {
            description: "Assign an earned stat point.",
            entrypoint: "assign_stat_point",
            name: "Assign Stat Point",
          },
          {
            description: "Choose one of the onchain reward offers.",
            entrypoint: "choose_reward",
            name: "Choose Reward",
          },
          {
            description: "Equip an owned item.",
            entrypoint: "equip_item",
            name: "Equip Item",
          },
        ],
      },
    },
  };
}

function wrapControllerAccount(account: ControllerAccount): GameSigner {
  return {
    async execute(calls) {
      const tx = await account.execute(calls);
      return {
        transaction_hash: normalizeTransactionHash(tx),
      };
    },
  };
}

function normalizeTransactionHash(tx: { transaction_hash?: string; transactionHash?: string }) {
  const hash = tx.transaction_hash ?? tx.transactionHash;
  if (!hash) {
    throw new Error("Controller transaction response did not include a hash.");
  }
  return hash;
}

function controllerChainId(chainId: string): string {
  if (chainId.startsWith("0x")) return chainId;

  const encoded = new TextEncoder().encode(chainId.toUpperCase());
  let hex = "0x";
  for (const byte of encoded) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function walletSignupOptions(): AuthOptions {
  return ["google", "webauthn", "discord", "walletconnect"];
}
