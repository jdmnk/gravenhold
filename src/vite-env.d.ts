/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCOUNT_MODE?: string;
  readonly VITE_CONTROLLER_KEYCHAIN_URL?: string;
  readonly VITE_DOJO_ACTIONS_ADDRESS?: string;
  readonly VITE_DOJO_NAMESPACE?: string;
  readonly VITE_DOJO_PROFILE?: string;
  readonly VITE_DOJO_WORLD_ADDRESS?: string;
  readonly VITE_LOCAL_ACCOUNT_ADDRESS?: string;
  readonly VITE_LOCAL_PRIVATE_KEY?: string;
  readonly VITE_SLOT_PROJECT?: string;
  readonly VITE_STARKNET_CHAIN_ID?: string;
  readonly VITE_STARKNET_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
