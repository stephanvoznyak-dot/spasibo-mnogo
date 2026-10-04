# ROADMAP — остаток после A / B-a / C

## Сделано (1.3.4)

- History: act → m2 → clearing | write_down; атомарный append; миграция remaining
- Клиринг = локальная гипотеза с подписью автора (не PAL / не EOS)
- Limits: amount ≤ 10¹², bidi в note, MAX_CYCLE_LEN=7, MAX_CYCLE_STEPS
- Экспорт History v2; protocol tests в `npm test` / `test:canon`
- Android versionName 1.3.4; PIN helper `src/crypto/pin-session.ts`
- UI: подсказка «клиринг локальный…»

## Сознательно отложено

### B-б — многосторонний клиринг
Подписи всех узлов цикла, протокол сбора (QR-круг / P2P), слияние History.  
Это отдельный протокол (ближе к EOS PAL §5.6), не «доделка» Варика.

### Domain separation подписи акта
Префикс `"normal-project/act/v1"` потребует `ACT_VERSION = 2` и инвалидирует все существующие акты.  
Вводить только вместе с версионированием wire и миграцией.

### Полная чистка app-builder
Удаление `server/`, `src/lib/auth`, better-auth, pglite, nitro, 20× radix — ломка текущего `vite`/`scripts/with-app-env`.  
Отдельный PR: упрощённый `vite.config` + `build:standalone` как единственный путь.

### Dual-write legacy `acts`
Пока dual-write для swarm/export. Убрать после 1–2 релизов только-History.

### PIN в UI
API: `sealMnemonicWithPin` / `openMnemonicWithPin`.  
Нужен экран Settings → «Задать PIN» / «Разблокировать» и запись blob в IndexedDB settings.

## Рекомендуемый порядок
1. PIN UI (день)
2. Упрощённый vite standalone-only (1–2 дня)
3. Снятие dual-write
4. ACT_VERSION 2 + domain separation (по необходимости совместимости)
5. B-б только при продуктовой необходимости
