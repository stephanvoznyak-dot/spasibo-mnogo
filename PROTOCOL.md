# PROTOCOL.md — Normal Project / Personal Ledger

Версия протокола: **1**  
Версия приложения: **1.3.2**

Репозиторий: https://github.com/stephanvoznyak-dot/spasibo-mnogo  
Канал: https://t.me/+buaSHWKuVTY2ZmNi  
Автор концепции: Ларионов Пётр · +7 903 606-00-06 · @Peterlarionov

## 1. Идентичность

- Энтропия: `crypto.getRandomValues` (128 бит = 12 слов, 256 бит = 24 слова).
- Мнемоника: BIP-39, английский wordlist (`@scure/bip39`).
- Seed: `PBKDF2-HMAC-SHA512(mnemonic, "mnemonic" + passphrase="", iterations=2048)` → 64 байта.
- Ключи: Ed25519 keypair из `seed[0..31]` (`@noble/ed25519`). Это упрощённая детерминированная схема промышленного образца (не SLIP-0010).
- Идентификатор агента: публичный ключ, hex (64 символа).
- Отпечаток: первые 12 hex-символов `SHA-256(publicKey)`, группами `xxxx-xxxx-xxxx`.

Приватный ключ никогда не сериализуется в QR, экспорт журнала, логи и исключения.

## 2. Каноническая сериализация акта

Перед хешированием и подписью акт кодируется как CBOR-массив фиксированной длины (не map — чтобы исключить неоднозначность порядка ключей):

```
ActBody = [
  version:     uint,          // 1
  from:        bstr (32),     // Ed25519 public key
  to:          bstr (32),
  amount:      uint,          // integer ≥ 1
  note:        tstr,          // ≤ 280, без управляющих символов
  timestamp:   uint,          // unix ms
  nonce:       bstr (16)
]
```

Кодирование: `cborg.encode(value, { float64: true })` — definite length, каноническая сортировка (для массива не требуется).

```
hash = SHA-256(CBOR(ActBody))
sigM1 = Ed25519.Sign(sk_from, hash)
sigM2 = Ed25519.Sign(sk_to,   hash) | null
```

Хранимое поле `hash` — кэш. При любой проверке хеш **пересчитывается**.

Проводной формат (QR / IndexedDB):

```
ActWire = ActBody || [ sigM1 (64), sigM2 (64|null) ]
```

## 3. Жизненный цикл

1. Черновик: `to`, `amount`, `note`.
2. M1: канонический CBOR → SHA-256 → подпись инициатора. Поля заморожены.
3. QR `act-proposal` (sigM2 = null).
4. Получатель пересчитывает hash, проверяет M1, `amount ≥ 1`, `to == self`.
5. M2: подпись того же hash. Устанавливается один раз.
6. Финализация в журналы обеих сторон (`pending_m2` у инициатора обновляется до `finalized`, остаток = сумма).
7. Поиск циклов / клиринг.

## 4. QR-конверт

```json
{
  "proto": "normal-project",
  "ver": 1,
  "type": "act-proposal" | "act-final" | "sync-request" | "sync-response",
  "payload": "<base64url(CBOR(ActWire))>"
}
```

ECC QR: уровень M. Fallback: ручная вставка JSON или base64url, снимок QR.

## 5. Журнал

IndexedDB `normal-project`:

- `acts` — ключ `hashHex`, индексы `from`, `to`, `timestamp`, `status`
- `identity` / `keys` — зашифрованная мнемоника (AES-GCM, неэкспортируемый wrapping key)
- `contacts`, `settings`, `events`

Статусы: `pending_m2` | `finalized` | `partially_cleared` | `cleared` | `archived`.

`remainingAmount` = ещё не погашенная клирингом часть. Всегда `0 ≤ remaining ≤ amount`. Без M2 остаток = 0. Клиринг идёт строго по текущему остатку (F05). Импорт журнала зажимает остаток в эти границы.

## 6. Клиринг

Ориентированный граф: вершина = агент, вес ребра = сумма `remainingAmount` однонаправленных финализированных актов.

Цикл длины ≥ 2, максимум 12. Residual `r(C) = min remaining(e)`.

```
remaining(e) ← remaining(e) − r(C)
```

**Инвариант — нетто-позиции узлов, не парные B_ij.**

```
S_i = Σ remaining(j→i) − Σ remaining(i→j)
∀ i  S_i(после) = S_i(до)
```

Многосторонний клиринг как раз меняет парные B_ij по рёбрам цикла (каждое уменьшается на residual). Суммарная позиция каждого узла не меняется: это и есть «долги сократились, сальдо людей то же».

Снимок нетто отфильтровывает нули: полностью погашенный треугольник 10-10-10 даёт пустой snapshot и до, и после.

Фиктивный клиринг (нет цикла / r=0 / нет актов) возвращает ошибку F04.

Пример: 18 → 12 → 8, residual 8 → остатки 10, 4, 0.

## 7. Рой

BitTorrent-inspired, транспорт HTML: `BroadcastChannel("normal-project-swarm")` + ping в `localStorage`.

Сообщения: `bitfield`, `have`, `want`, `piece`.  
`piece` принимается только после полной верификации подписей.  
APK: тот же интерфейс; обмен между телефонами в этой версии — через QR.

## 8. Версионирование

Несовместимое изменение `ActBody` или конверта увеличивает `ver`. Реализации должны отказывать на чужой `ver` с понятным сообщением.
