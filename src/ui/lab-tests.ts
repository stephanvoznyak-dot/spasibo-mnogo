import { bytesToHex } from "@/crypto/bytes";
import { createMnemonic } from "@/crypto/bip39";
import { deriveKeypair } from "@/crypto/keys";
import { createSignedM1, signM2, verifyAct } from "@/protocol/act";
import { applyCycle, findCycles } from "@/protocol/clearing";
import { snapshotNets } from "@/protocol/graph";
import { decodeQrMessage, encodeQrMessage } from "@/protocol/qr-messages";
import { ProtocolError, type ClearingCycle, type LedgerEntry } from "@/protocol/types";
import { entryFromAct, mergeFinalEntry } from "@/swarm/sync";

function line(ok: boolean, name: string, extra = "") {
  return `${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`;
}

function agent() {
  return deriveKeypair(createMnemonic(12));
}

function entriesOf(acts: ReturnType<typeof signM2>[]): LedgerEntry[] {
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
    signM2(createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 10 }), b.secretKey, b.publicKey),
    signM2(createSignedM1({ fromSecret: b.secretKey, fromPublic: b.publicKey, to: c.publicKey, amount: 10 }), c.secretKey, c.publicKey),
    signM2(createSignedM1({ fromSecret: c.secretKey, fromPublic: c.publicKey, to: a.publicKey, amount: 10 }), a.secretKey, a.publicKey),
  ]);
  const beforeEq = snapshotNets(triangle);
  const cyclesEq = findCycles(triangle);
  out.push(line(cyclesEq.length === 1 && cyclesEq[0]!.residual === 10, "цикл A→B→C→A", `n=${cyclesEq.length}`));
  if (cyclesEq[0]) {
    const threw = caught(() => applyCycle(triangle, cyclesEq[0]!));
    out.push(line(!threw && triangle.every((e) => e.remainingAmount === 0), "клиринг residual 10"));
    out.push(line(!threw && snapshotNets(triangle) === beforeEq, "инвариант нетто (нули)"));
  }

  const uneven = entriesOf([
    signM2(createSignedM1({ fromSecret: a.secretKey, fromPublic: a.publicKey, to: b.publicKey, amount: 18 }), b.secretKey, b.publicKey),
    signM2(createSignedM1({ fromSecret: b.secretKey, fromPublic: b.publicKey, to: c.publicKey, amount: 12 }), c.secretKey, c.publicKey),
    signM2(createSignedM1({ fromSecret: c.secretKey, fromPublic: c.publicKey, to: a.publicKey, amount: 8 }), a.secretKey, a.publicKey),
  ]);
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
  out.push(
    line(
      caught(() => applyCycle([], fake)),
      "F04 фиктивный клиринг без актов",
    ),
  );

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
  out.push(line(back.type === "act-proposal" && bytesToHex(back.act.hash) === bytesToHex(frozen.hash), "QR конверт roundtrip"));

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
