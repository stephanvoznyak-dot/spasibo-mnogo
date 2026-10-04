# PROTOCOL.md — Normal Project / Personal Ledger

Версия протокола: **1**  
Версия приложения: **1.3.3**

Репозиторий: [https://github.com/stephanvoznyak-dot/spasibo-mnogo](https://github.com/stephanvoznyak-dot/spasibo-mnogo)  
Канал: [https://t.me/+buaSHWKuVTY2ZmNi](https://t.me/+buaSHWKuVTY2ZmNi)  
Автор концепции: Ларионов Пётр · +7 903 606-00-06 · @Peterlarionov

> **Несовместимость с EOS.** Это самостоятельный протокол *normal-project v1* («Варик»).  
> Он **не** реализует EOS Specification v4.1 (нет JCS, SLIP-0010, PAL, Validator ERR-*).  
> Записи журнала нельзя выдавать за SharedRecord EOS.

## 1. Идентичность

- Энтропия: `crypto.getRandomValues` (128 бит = 12 слов, 256 бит = 24 слова).
- Мнемоника: BIP-39, английский wordlist (`@scure/bip39`).
- Seed: `PBKDF2-HMAC-SHA512(mnemonic, "mnemonic" + passphrase="", iterations=2048)` → 64 байта.
- Ключи: Ed25519 keypair из `seed[0..31]` (`@noble/ed25519`). Упрощённая схема (не SLIP-0010).
- Идентификатор агента: публичный ключ, hex (64 символа).
- Отпечаток: первые 12 hex-символов `SHA-256(publicKey)`, группами `xxxx-xxxx-xxxx`.

Приватный ключ никогда не сериализуется в QR, экспорт журнала, логи и исключения.

## 2. Каноническая сериализация акта

```
ActBody = [
  version:     uint,          // 1
  from:        bstr (32),
  to:          bstr (32),
  amount:      uint,          // integer ≥ 1
  note:        tstr,          // ≤ 280
  timestamp:   uint,
  nonce:       bstr (16 байт при создании; декодер допускает 8…16 для legacy)
]
```

```
hash = SHA-256(CBOR(ActBody))
sigM1 = Ed25519.Sign(sk_from, hash)
sigM2 = Ed25519.Sign(sk_to,   hash) | null
```

## 3. Жизненный цикл и History

Источник истины — **append-only History** (не мутабельный `remainingAmount`).

События:

1. `{ kind: "act", wire }` — M1 (sigM2 на wire = null).
2. `{ kind: "m2", assertion: { actHash, sigM2 } }` — принятие контрагентом.
3. `{ kind: "clearing", assertion }` — локальная гипотеза клиринга (см. §6).
4. `{ kind: "write_down" }` — только миграция legacy.

```
State = deriveState(History)
```

## 4. QR-конверт

```json
{
  "proto": "normal-project",
  "ver": 1,
  "type": "act-proposal" | "act-final" | "sync-request" | "sync-response",
  "payload": "<base64url(CBOR(ActWire))>"
}
```

Лимиты: raw ≤ 8192 символов, payload ≤ 4096 байт (до decode).

## 5. Журнал

IndexedDB `normal-project`:

- `history` — упорядоченный журнал событий (источник истины)
- `acts` — legacy-снимок для UI/swarm (dual-write, не источник истины)
- `identity` / `keys`, `contacts`, `settings`

Статусы **выводятся** из State: `pending_m2` | `finalized` | `partially_cleared` | `cleared`.

### 5.1 Пределы

- `amount`: целое ≥ 1 (в коде верхняя граница — `Number.MAX_SAFE_INTEGER`; в доке ориентир ≤ 10¹²).
- `note`: ≤ 280, без C0-управляющих.
- `from == to` недопустим.

### 5.2 Чужие акты (модель угроз vs клиринг)

- **Подписанные** акты M1+M2 криптографически проверяемы независимо от того, «я сторона» или нет.
- Для **локального** поиска циклов узлу могут понадобиться акты третьих лиц (B→C в треугольнике). Их допустимо держать в History (демо, импорт, будущий обмен).
- Сетевой QR/рой в UI **не обязан** отфильтровывать «не мои» акты: доверие к содержимому = доверие к подписям.  
  Заявление «принимаются только акты, где вы сторона» относится к **рекомендуемой политике UI**, а не к инварианту `verifyAct`.

## 6. Клиринг — локальная гипотеза (этап B-a)

**Решение:** клиринг **не** является многосторонним согласованным фактом (не PAL / EOS §5.6/§5.8).

Это **личная гипотеза** узла:

1. Узел находит цикл на своём State.
2. Строит `ClearingAssertion` и **подписывает своим ключом** (author + sig).
3. Применяет residual к своему State через `deriveState`.
4. UI помечает результат: «клиринг локальный, не подтверждён контрагентами».

```
ClearingBody = [ version, cycle[], residual, appliedAt, nonce, authorPub ]
hash = SHA-256(CBOR(ClearingBody))
sig  = Ed25519.Sign(sk_author, hash)
```

Инвариант нетто-позиций `N_i` сохраняется математически, но **не доказывает согласие** других узлов.  
Два устройства, погасившие один цикл независимо, получат **разные** события (разный nonce/подпись) — History **не сливается** автоматически.

Максимум длины цикла: **7** (`MAX_CYCLE_LEN`).  
Фиктивный клиринг → F04.

Legacy assertion без author/sig допускается при derive (unsigned), но новые клиринги из UI всегда подписываются.

## 7. Рой

`BroadcastChannel("normal-project-swarm")` — обмен между вкладками **одного origin**, не между телефонами.  
Между устройствами в v1 — QR.

## 8. Версионирование

Несовместимое изменение `ActBody` / HistoryEvent увеличивает `ver`.
