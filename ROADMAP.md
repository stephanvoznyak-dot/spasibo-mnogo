# ROADMAP

## Сделано (1.3.4 → 1.3.5)

- History: act → m2 → clearing | write_down; атомарный append; миграция
- Клиринг = локальная гипотеза + подпись автора
- Limits: amount ≤ 10¹², bidi, MAX_CYCLE_LEN=7, MAX_CYCLE_STEPS
- Lab: `lab-demo` + телефон (compat)
- Domain prefixes в `src/crypto/domain.ts` (wire акта без ACT_VERSION 2)
- PIN API + Settings UI; restore store (postinstall / Vite / `npm run restore:store`)
- **History-only:** `DUAL_WRITE_LEGACY=false` после restore
- Android versionName 1.3.5, versionCode 6

## Чистка app-builder (в работе)

- `npm run dev:app` — продукт без TanStack/Nitro (см. `CLEANUP.md`)
- Следующий PR: вырезать better-auth, pglite, radix×21, nitro из `package.json`

## Сознательно отложено

### B-б — многосторонний клиринг
Подписи всех узлов цикла — отдельный протокол.

### Domain separation на актах
`ACT_VERSION = 2` ломает старые акты без миграции.

### Dual-write legacy acts
Флаг `DUAL_WRITE_LEGACY` (сейчас false). Включить только для совместимости swarm/export.

## Рекомендуемый порядок
1. Прогнать `dev:app` + `build:standalone` + `test:canon`
2. PR удаления deps (`CLEANUP.md`)
3. B-б — по продуктовой необходимости
