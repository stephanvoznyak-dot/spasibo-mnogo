# PROTOCOL.md — Normal Project / Personal Ledger

Версия протокола: **1**  
Версия приложения: **1.3.1**

## 1. Идентичность

- Энтропия: `crypto.getRandomValues` (128 бит = 12 слов, 256 бит = 24 слова).
- Мнемоника: BIP-39, английский wordlist (`@scure/bip39`).
- Seed: `PBKDF2-HMAC-SHA512(mnemonic, "mnemonic" + passphrase="", iterations=2048)` → 64 байта.
- Ключи: Ed25519 keypair из `seed[0..31]` (`@noble/ed25519`). Это упрощённая детерминированная схема промышленного образца (не SLIP-0010).
- Идентификатор агента: публичный ключ, hex (64 символа).
- Отпечаток: первые 12 hex-символов `SHA-256(publicKey)`, группами `xxxx-xxxx-xxxx`.

Приватный ключ никогда не сериализуется в QR, экспорт журнала, логи и исключения.

## 2. Каноническая сериализация акта

Перед хешированием и подписью акт кодируется как CBOR-массив фиксированной длины (не map).

ActBody = [version, from, to, amount, note, timestamp, nonce]

hash = SHA-256(CBOR(ActBody))
sigM1 = Ed25519.Sign(sk_from, hash)
sigM2 = Ed25519.Sign(sk_to, hash) | null

Хранимое поле hash — кэш. При любой проверке хеш пересчитывается.

## 3. Жизненный цикл

1. Черновик: to, amount, note.
2. M1: канонический CBOR → SHA-256 → подпись инициатора. Поля заморожены.
3. QR act-proposal (sigM2 = null).
4. Получатель пересчитывает hash, проверяет M1, amount ≥ 1, to == self.
5. M2: подпись того же hash. Устанавливается один раз.
6. Финализация в журналы обеих сторон.
7. Поиск циклов / клиринг.

## 4. QR-конверт

proto: normal-project, ver: 1, type: act-proposal | act-final | sync-request | sync-response,
payload: base64url(CBOR(ActWire))

ECC QR: уровень M. Fallback: ручная вставка JSON или base64url.

## 5. Журнал

IndexedDB `normal-project`. Статусы: pending_m2 | finalized | partially_cleared | cleared | archived.
remainingAmount = непогашенная клирингом часть.

## 6. Клиринг

Цикл длины ≥ 2, максимум 12. Residual r(C) = min remaining(e).
Инвариант: нетто-позиции узлов не меняются.
Фиктивный клиринг — ошибка F04.

## 7. Рой

BroadcastChannel(normal-project-swarm): bitfield, have, want, piece.
piece только после полной верификации подписей.

## 8. Версионирование

Несовместимое изменение ActBody увеличивает ver.
