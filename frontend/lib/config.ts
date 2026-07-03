import { studionet } from "genlayer-js/chains";

export const CHAIN = studionet;
export const CHAIN_HEX = ("0x" + studionet.id.toString(16)) as `0x${string}`;
export const CHAIN_RPC = studionet.rpcUrls.default.http[0];
export const CHAIN_NAME = studionet.name;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x943918c5D4C76f3Be4Be7E409ABd1B00f7D2d06e") as `0x${string}`;
export const CONTRACT_CONFIGURED = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);

export const PAGE_STATES = ["LIVE", "BLOCKED", "GONE"] as const;
export const REV_VERDICTS = ["UNCHANGED", "EDITED", "GONE"] as const;
