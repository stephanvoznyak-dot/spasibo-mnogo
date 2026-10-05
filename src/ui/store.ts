import { create } from "zustand";
import { describeAct } from "@/protocol/act";
import { counterparties } from "@/protocol/graph";
import { actionsPart1 } from "./store-actions-1";
import { actionsPart2 } from "./store-actions-2";
import type { AppState } from "./store-helpers";

export type { Screen, Identity, QrPayload, AppState } from "./store-helpers";
export { DUAL_WRITE_LEGACY } from "./store-helpers";

export const useApp = create<AppState>((set, get) => ({
  ...actionsPart1(set, get),
  ...actionsPart2(set, get),
}) as AppState);

export { describeAct, counterparties };
