# ROADMAP

## Сделано (1.3.5)

- Canon History + deriveState; клиринг = локальная гипотеза
- PIN UI; History-only (`DUAL_WRITE_LEGACY=false` после restore)
- Android 1.3.5 / versionCode 6
- **Чистка deps:** lean package.json (~19 runtime), standalone vite/tsconfig
- `npm run dev:app` = продуктовый UI без app-builder shell

## Отложено

| Пункт | Почему |
|-------|--------|
| Удалить каталоги `src/lib`, `src/routes`, `server` | мёртвый код; можно `rm -rf` отдельно |
| ACT_VERSION 2 + domain на актах | ломает старые QR |
| B-б multi-party клиринг | отдельный протокол |

## Команды

```bash
npm install && npm run restore:store
npm run dev:app
npm run build:standalone
npm run test:canon
```
