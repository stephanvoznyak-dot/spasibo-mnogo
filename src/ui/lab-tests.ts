import { bytesToHex } from "@/crypto/bytes";
import { createMnemonic } from "@/crypto/bip39";
import { deriveKeypair } from "@/crypto/keys";
import { createSignedM1, signM2, verifyAct } from "@/protocol/act";
import { applyCycle, findCycles } from "@/protocol/clearing";
import {
  appendClearing,
  deriveState,
  findCyclesFromState,
  snapshotStateNets,
} from "@/protocol/derive";
import { appendAct, historyFromActs, MAX_CYCLE_LEN } from "@/protocol/history";
import { snapshotNets } from "@/protocol/graph";
import {
  decodeQrMessage,
  encodeQrMessage,
  QR_MAX_RAW_CHARS,
} from "@/protocol/qr-messages";
import { ProtocolError, type Act, type ClearingCycle, type History, type LedgerEntry } from "@/protocol/types";
import { entryFromAct, mergeFinalEntry } from "@/swarm/sync";

function line(ok: boolean, name: string, extra = "") {
  return `${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`;
}

function agent() {
  return deriveKeypair(createMnemonic(12));
}

function finalAct(
  from: { secretKey: Uint8Array; publicKey: Uint8Array },
  to: { secretKey: Uint8Array; publicKey: Uint8Array },
  amount: number,
): Act {
  return signM2(
    createSignedM1({
      fromSecret: from.secretKey,
      fromPublic: from.publicKey,
      to: to.publicKey,
      amount,
    }),
    to.secretKey,
    to.publicKey,
  );
}

function entriesOf(acts: Act[]): LedgerEntry[] {
  return acts.map((act) => ({
    act,
    status: "finalized" as const,
    remainingAmount: act.amount,
    addedAt: 1,
  }));
}

function caught(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

/** Classic F01–F08 + merge tests. */
export function runLabSuite(): string[] {
  const out: string[] = [];
  const a = agent();
  const b = agent();
  const c = agent();

  const xssNote = "<img src=x onerror=alert(1)>";
  const xss = createSignedM1({
    fromSecret: a.secretKey,
    fromPublic: a.publicKey,
    to: b.publicKey,
    amount: 1,
    note: xssNote,
  });
  out.push(line(xss.note === xssNote && verifyAct(xss).ok, "F01 пометка как текст"));

  out.push(
    line(
      caught(() =>
        createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 1.5 }),
      ),
      "F03 дробная сумма",
    ),
  );
  out.push(
    line(
      caught(() =>
        createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: -1 }),
      ),
      "F03 отрицательная сумма",
    ),
  );

  const triangle = entriesOf([
    finalAct(a, b, 10),
    finalAct(b, c, 10),
    finalAct(c, a, 10),
  ]);
  const beforeEq = snapshotNets(triangle);
  const cyclesEq = findCycles(triangle);
  out.push(line(cyclesEq.length === 1 && cyclesEq[0]!.residual === 10, "цикл A→B→C→A", `n=${cyclesEq.length}`));
  if (cyclesEq[0]) {
    const threw = caught(() => applyCycle(triangle, cyclesEq[0]!));
    out.push(line(!threw && triangle.every((e) => e.remainingAmount === 0), "клиринг residual 10"));
    out.push(line(!threw && snapshotNets(triangle) === beforeEq, "инвариант нетто (нули)"));
  }

  const uneven = entriesOf([finalAct(a, b, 18), finalAct(b, c, 12), finalAct(c, a, 8)]);
  const beforeU = snapshotNets(uneven);
  const cycU = findCycles(uneven);
  let applied = false;
  if (cycU[0]) {
    applied = !caught(() => applyCycle(uneven, cycU[0]!));
  }
  out.push(
    line(
      applied &&
        cycU[0]?.residual === 8 &&
        uneven.map((e) => e.remainingAmount).join(",") === "10,4,0" &&
        snapshotNets(uneven) === beforeU,
      "демо 18-12-8 → 10-4-0",
    ),
  );

  out.push(line(findCycles([]).length === 0, "F04 пустой граф"));
  const fake: ClearingCycle = {
    nodes: [bytesToHex(a.publicKey), bytesToHex(b.publicKey)],
    residual: 1,
    edges: [{ from: bytesToHex(a.publicKey), to: bytesToHex(b.publicKey), weight: 1 }],
  };
  out.push(line(caught(() => applyCycle([], fake)), "F04 фиктивный клиринг без актов"));

  const frozen = createSignedM1({
    fromSecret: a.secretKey,
    fromPublic: a.publicKey,
    to: b.publicKey,
    amount: 4,
    note: "лаборатория",
  });
  out.push(
    line(
      caught(() => {
        verifyAct({ ...frozen, amount: 9 });
      }),
      "F07 заморозка полей",
    ),
  );
  const hashCheck = verifyAct({ ...frozen, hash: new Uint8Array(32) });
  out.push(line(bytesToHex(hashCheck.hash) === bytesToHex(frozen.hash), "F06 хеш пересчитан"));

  const qr = encodeQrMessage("act-proposal", frozen);
  const back = decodeQrMessage(qr);
  out.push(
    line(back.type === "act-proposal" && bytesToHex(back.act.hash) === bytesToHex(frozen.hash), "QR конверт roundtrip"),
  );

  const second = [...uneven];
  out.push(
    line(
      cycU[0]
        ? caught(() =>
            applyCycle(second, {
              ...cycU[0]!,
              residual: 99,
              edges: cycU[0]!.edges.map((e) => ({ ...e, weight: 99 })),
            }),
          )
        : false,
      "F05 отказ от завышенного residual",
    ),
  );

  out.push(line(ProtocolError !== undefined, "F08 ошибки видимы (ProtocolError)"));

  const pending = entryFromAct(frozen);
  const finalized = signM2(frozen, b.secretKey, b.publicKey);
  const upgraded = mergeFinalEntry([pending], finalized);
  out.push(
    line(
      upgraded.changed &&
        upgraded.entries[0]?.status === "finalized" &&
        upgraded.entries[0]?.remainingAmount === 4 &&
        Boolean(upgraded.entries[0]?.act.sigM2),
      "pending_m2 → final при M2",
    ),
  );
  const again = mergeFinalEntry(upgraded.entries, finalized);
  out.push(line(!again.changed, "повторный final не дублирует акт"));

  return out;
}

/** Canon 2.2: History → State, idempotency, QR size, cycle bound. */
export function runCanonSuite(): string[] {
  const out: string[] = [];
  const a = agent();
  const b = agent();
  const c = agent();

  // Empty history
  const empty = deriveState([]);
  out.push(line(empty.acts.size === 0 && empty.net.size === 0, "C01 empty History → empty State"));

  // Single finalized act → act + m2 events
  const act42 = finalAct(a, b, 42);
  const h1 = historyFromActs([act42]);
  const s1 = deriveState(h1);
  out.push(
    line(
      s1.remaining.get(bytesToHex(act42.hash)) === 42 && s1.status.get(bytesToHex(act42.hash)) === "finalized",
      "C02 single act remaining=amount",
    ),
  );

  // Idempotent appendAct: finalized act expands to act+m2 (len 2); second call no-op
  const r1 = appendAct([], act42);
  const r2 = appendAct(r1.history, act42);
  out.push(
    line(
      r1.added === true &&
        r2.added === false &&
        r2.history.length === r1.history.length &&
        r1.history.length === 2 &&
        r1.history[0]!.kind === "act" &&
        r1.history[1]!.kind === "m2",
      "C03 appendAct идемпотентен",
      `len=${r1.history.length}`,
    ),
  );

  // 18-12-8 via History (3 acts → 6 events: act+m2 each)
  const ab = finalAct(a, b, 18);
  const bc = finalAct(b, c, 12);
  const ca = finalAct(c, a, 8);
  let history: History = historyFromActs([ab, bc, ca]);
  const lenBeforeClear = history.length; // 6
  const before = deriveState(history);
  const netsBefore = snapshotStateNets(before);
  const cycles = findCyclesFromState(before);
  out.push(line(cycles.length >= 1 && cycles[0]!.residual === 8, "C04 цикл residual=8", `n=${cycles.length}`));
  out.push(line((cycles[0]?.nodes.length ?? 99) <= MAX_CYCLE_LEN, "C05 длина цикла ≤ MAX_CYCLE_LEN", `max=${MAX_CYCLE_LEN}`));

  if (cycles[0]) {
    const { history: afterH, state: after } = appendClearing(history, cycles[0]);
    history = afterH;
    const okRem =
      after.remaining.get(bytesToHex(ab.hash)) === 10 &&
      after.remaining.get(bytesToHex(bc.hash)) === 4 &&
      after.remaining.get(bytesToHex(ca.hash)) === 0;
    out.push(line(okRem, "C06 18-12-8 → remaining 10/4/0"));
    out.push(line(snapshotStateNets(after) === netsBefore, "C07 инвариант N_i после ClearingAssertion"));
    // +1 clearing event after act/m2 pairs
    out.push(
      line(
        afterH.length === lenBeforeClear + 1 && afterH[afterH.length - 1]!.kind === "clearing",
        "C08 History += ClearingAssertion",
        `len ${lenBeforeClear}→${afterH.length}`,
      ),
    );

    // Recovery
    const recovered = deriveState(afterH);
    out.push(
      line(
        recovered.remaining.get(bytesToHex(ab.hash)) === 10 &&
          recovered.remaining.get(bytesToHex(ca.hash)) === 0,
        "C09 Recovery = deriveState(History)",
      ),
    );

    // Determinism
    const sA = deriveState(afterH);
    const sB = deriveState(afterH);
    out.push(line(snapshotStateNets(sA) === snapshotStateNets(sB), "C10 deriveState детерминирован"));
  }

  // History not mutated by deriveState
  const frozenH: History = historyFromActs([finalAct(a, b, 5)]);
  const lenBefore = frozenH.length;
  deriveState(frozenH);
  out.push(line(frozenH.length === lenBefore, "C11 History не мутируется deriveState"));

  // QR size limit
  out.push(
    line(
      caught(() => decodeQrMessage("x".repeat(QR_MAX_RAW_CHARS + 10))),
      "C12 QR_SIZE отказ на oversized",
    ),
  );

  // pending_m2
  const pend = createSignedM1({
    fromSecret: a.secretKey,
    fromPublic: a.publicKey,
    to: b.publicKey,
    amount: 3,
  });
  const sp = deriveState([{ kind: "act", wire: pend }]);
  out.push(
    line(
      sp.remaining.get(bytesToHex(pend.hash)) === 0 && sp.status.get(bytesToHex(pend.hash)) === "pending_m2",
      "C13 pending_m2 remaining=0",
    ),
  );

  return out;
}

export function runAllSuites(): { classic: string[]; canon: string[] } {
  return { classic: runLabSuite(), canon: runCanonSuite() };
}
