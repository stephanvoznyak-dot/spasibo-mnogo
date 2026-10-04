# Changelog

## 1.3.4 — 2026-10-05

**Этап A — стык History (критика аудитов Astra / Claude Fable):**
- M2 — отдельное событие History `{ kind: "m2", actHash, sigM2 }` (исправлена потеря финализации у инициатора).
- Атомарный `appendHistoryEvent` (одна readwrite-транзакция).
- Миграция legacy → History с `write_down` на `amount − remaining`.
- Экспорт/импорт History v2 (acts + m2 + clearing + write_down).
- `boot()` без silent fallback на другой журнал.
- Тесты: m2-reload, Canon C01–C13 (13 PASS).

**Этап B-a — модель клиринга:**
- Клиринг = **локальная гипотеза** узла (не PAL / не EOS).
- `ClearingAssertion` с `author` + Ed25519 `sig`; verify при derive.
- PROTOCOL/README: явно «normal-project v1, не EOS v4.1».
- Политика чужих актов: доверие к подписям; фильтр «я сторона» — UI, не инвариант.

**Этап C (частично):**
- `amount ≤ 10^12` в коде (`MAX_AMOUNT`).
- `sanitizeNote` удаляет bidi-символы U+202A–E, U+2066–9.
- `npm test` / `npm run test:canon` включают `src/protocol/*.test.ts`.
- `package.json` name: `normal-project`.
- SECURITY.md синхронизирован с A/B.

Ещё не сделано: полная чистка app-builder deps, PIN UI, domain separation подписи акта.

## 1.3.3 — 2026-10-03

Исправления по аудиту:
- Клиринг: бюджет / MAX_CYCLE_LEN=7; транзакционный путь через assertion.
- Импорт журнала строгий; нормализация status/remaining.
- PROTOCOL.md §6: инвариант — нетто-позиции.
- iOS через Capacitor; IOS_BUILD.md.
- Телефон автора в документации и лаборатории.

## 1.3.2 — 2026-10-03

- Полный исходник на GitHub
- PROTOCOL: инвариант нетто-позиций
- Импорт зажимает remainingAmount

## 1.3.1 — 2026-10-01

- Снимок QR; ошибки M2; клиринг сбрасывает выбор

## 1.3.0 — 2026-09-30

- Финальный QR обновляет pending_m2 у инициатора

## 1.2.0 — 2026-09-28

- QR BarcodeDetector + jsQR; лаборатория F01–F08

## 1.1.0 — 2026-09-27

- Продуктовое имя «Спасибо много»; лаборатория; golden-тесты

## 1.0.0 — 2026-09-22

- Промышленный образец: BIP-39, Ed25519, CBOR, QR M1/M2, клиринг, рой, HTML/APK
