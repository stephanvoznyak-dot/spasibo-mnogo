# Чистка app-builder — завершена

## Продукт

```bash
npm install
npm run restore:store
npm run dev:app
npm run build:standalone
npm run test:canon
```

- deps: 19 runtime + 20 dev
- `src/lib/` — только `utils.ts` (`cn`)
- удалены: auth, app-data, multiplayer, routes, router, db, preview, routeTree

## Действующее

`src/ui`, `src/protocol`, `src/storage`, `src/crypto`, `src/swarm`, `src/components`, `src/standalone.tsx`
