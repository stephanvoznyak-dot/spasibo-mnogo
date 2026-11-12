import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bytesToHex } from "../crypto/bytes.ts";
import {
  clampRemaining,
  remainingOf,
  activeEdges,
  pairBalance,
  nodeNets,
  snapshotNets,
  counterparties,
  aggregateAdj,
} from "./graph.ts";
import type { Act, LedgerEntry } from "./types.ts";

function dummyAct(from: Uint8Array, to: Uint8Array, amount: number, hasM2 = true): Act {
  const hash = new Uint8Array(32);
  hash[0] = amount % 256;
  return {
    version: 1,
    from,
    to,
    amount,
    note: "",
    timestamp: Date.now(),
    nonce: new Uint8Array(16),
    hash,
    sigM1: new Uint8Array(64),
    sigM2: hasM2 ? new Uint8Array(64) : null,
  };
}

function entry(
  from: Uint8Array,
  to: Uint8Array,
  amount: number,
  remaining: number,
  status: LedgerEntry["status"] = "finalized",
  hasM2 = true,
): LedgerEntry {
  return {
    act: dummyAct(from, to, amount, hasM2),
    status,
    remainingAmount: remaining,
    addedAt: Date.now(),
  };
}

const a = new Uint8Array([1, 2, 3]);
const b = new Uint8Array([4, 5, 6]);
const c = new Uint8Array([7, 8, 9]);
const aHex = bytesToHex(a);
const bHex = bytesToHex(b);
const cHex = bytesToHex(c);

describe("graph utilities", () => {
  it("clampRemaining handles edge cases", () => {
    assert.equal(clampRemaining(100, 50, false), 0);
    assert.equal(clampRemaining(100, NaN, true), 100);
    assert.equal(clampRemaining(100, Infinity, true), 100);
    assert.equal(clampRemaining(100, 150, true), 100);
    assert.equal(clampRemaining(100, -10, true), 0);
    assert.equal(clampRemaining(100, 42.7, true), 42);
  });

  it("remainingOf respects status and M2", () => {
    const e1 = entry(a, b, 100, 50, "finalized", true);
    assert.equal(remainingOf(e1), 50);
    const e2 = entry(a, b, 100, 50, "cleared", true);
    assert.equal(remainingOf(e2), 0);
    const e3 = entry(a, b, 100, 50, "pending_m2", false);
    assert.equal(remainingOf(e3), 0);
    const e4 = entry(a, b, 100, 50, "archived", true);
    assert.equal(remainingOf(e4), 0);
  });

  it("activeEdges filters correctly", () => {
    const entries = [
      entry(a, b, 100, 30, "finalized", true),
      entry(b, c, 50, 0, "finalized", true), // weight 0
      entry(a, c, 20, 20, "finalized", false), // no M2
      entry(c, a, 10, 10, "cleared", true),
    ];
    const edges = activeEdges(entries);
    assert.equal(edges.length, 1);
    assert.equal(edges[0].from, aHex);
    assert.equal(edges[0].to, bHex);
    assert.equal(edges[0].weight, 30);
  });

  it("pairBalance and nodeNets compute nets", () => {
    const entries = [
      entry(a, b, 100, 40),
      entry(b, a, 100, 15),
      entry(a, c, 50, 50),
    ];
    assert.equal(pairBalance(entries, aHex, bHex), 40 - 15);
    assert.equal(pairBalance(entries, bHex, aHex), 15 - 40);
    const nets = nodeNets(entries);
    assert.equal(nets.get(aHex), -40 - 50 + 15);
    assert.equal(nets.get(bHex), 40 - 15);
    assert.equal(nets.get(cHex), 50);
  });

  it("snapshotNets sorts and filters zeros", () => {
    const entries = [
      entry(a, b, 10, 10),
      entry(b, a, 10, 10), // net zero
    ];
    const snap = snapshotNets(entries);
    assert.equal(snap, ""); // both cancel or zero
    const entries2 = [entry(a, b, 20, 20)];
    const snap2 = snapshotNets(entries2);
    assert.ok(snap2.includes(aHex));
    assert.ok(snap2.includes(bHex));
  });

  it("counterparties aggregates by peer", () => {
    const entries = [
      entry(a, b, 100, 30),
      entry(b, a, 50, 10),
      entry(a, c, 40, 40),
    ];
    const cps = counterparties(entries, aHex);
    assert.equal(cps.length, 2);
    const bCp = cps.find((x) => x.publicKeyHex === bHex);
    assert.ok(bCp);
    assert.equal(bCp!.youOwe, 30);
    assert.equal(bCp!.theyOwe, 10);
    assert.equal(bCp!.net, -20);
  });

  it("aggregateAdj builds adjacency map", () => {
    const entries = [
      entry(a, b, 10, 10),
      entry(a, b, 5, 5),
      entry(a, c, 3, 3),
    ];
    const adj = aggregateAdj(entries);
    assert.equal(adj.get(aHex)?.get(bHex), 15);
    assert.equal(adj.get(aHex)?.get(cHex), 3);
    assert.equal(adj.size, 1);
  });
});
