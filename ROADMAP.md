# ROADMAP

## Сделано (1.3.5)

- Canon History + deriveState; клиринг = локальная гипотеза
- PIN UI; History-only (`DUAL_WRITE_LEGACY=false` после restore)
- Android 1.3.5 / versionCode 6
- Lean deps; `npm run dev:app` = продукт
- restore-store всегда с known-good payload
- Лишнее помечено **недействующим** (`src/lib/INACTIVE.md`)

## Недействующее (не трогать / не импортировать)

- `src/lib/auth/`, `src/lib/app-data/`, `src/lib/multiplayer/`

## Отложено (протокол)

| Пункт | |
|-------|--|
| ACT_VERSION 2 + domain на актах | ломает старые QR |
| B-б multi-party клиринг | отдельный протокол |

## Команды

```bash
npm install && npm run restore:store
npm run dev:app
npm run build:standalone
npm run test:canon
```
