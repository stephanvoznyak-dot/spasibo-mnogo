import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { startSwarm } from "./sync.ts";
import type { Act } from "../protocol/types.ts";
import { bytesToHex } from "../crypto/bytes.ts";

function dummyAct(hasM2 = true): Act {
  const hash = new Uint8Array(32);
  hash[0] = 42;
  return {
    version: 1,
    from: new Uint8Array([1]),
    to: new Uint8Array([2]),
    amount: 100,
    note: "test",
    timestamp: Date.now(),
    nonce: new Uint8Array(16),
    hash,
    sigM1: new Uint8Array(64),
    sigM2: hasM2 ? new Uint8Array(64) : null,
  };
}

describe("swarm sync", () => {
  const handles: ReturnType<typeof startSwarm>[] = [];

  after(() => {
    for (const h of handles) {
      try { h.close(); } catch {}
    }
  });

  it("starts and reports status without peers", () => {
    const self = "aabb";
    const hashes: string[] = [];
    const acts = new Map<string, Act>();
    const received: Act[] = [];

    const handle = startSwarm({
      selfHex: self,
      getHashes: () => hashes,
      getAct: (h) => acts.get(h),
      onAct: (a) => received.push(a),
    });
    handles.push(handle);

    const st = handle.status();
    assert.equal(st.peers, 1);
    assert.ok(typeof st.lastEvent === "string");
  });

  it("announces finalized act without throwing", () => {
    const self = "ccdd";
    const act = dummyAct(true);
    const hex = bytesToHex(act.hash);
    const hashes = [hex];
    const acts = new Map([[hex, act]]);

    const handle = startSwarm({
      selfHex: self,
      getHashes: () => hashes,
      getAct: (h) => acts.get(h),
      onAct: () => {},
    });
    handles.push(handle);

    handle.announce(act);
    assert.equal(handle.status().peers, 1);
  });

  it("ignores non-finalized announce", () => {
    const self = "eeff";
    const act = dummyAct(false);

    const handle = startSwarm({
      selfHex: self,
      getHashes: () => [],
      getAct: () => undefined,
      onAct: () => {},
    });
    handles.push(handle);

    handle.announce(act);
    assert.ok(true);
  });
});
