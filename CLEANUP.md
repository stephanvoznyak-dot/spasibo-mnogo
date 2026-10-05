# Чистка app-builder

## Продукт (действующее)

```bash
npm install
npm run restore:store   # History-only store
npm run dev:app         # standalone UI
npm run build:standalone
npm run test:canon
```

- deps: 19 runtime + 20 dev (без auth/pglite/radix/tanstack/nitro)
- `vite.config.ts` / `tsconfig.json` — только product paths
- Android `1.3.5` / versionCode `6`

## Недействующее (ещё в дереве)

Помечено `src/lib/INACTIVE.md`:

| Путь | |
|------|--|
| `src/lib/auth/` | бывший OAuth shell |
| `src/lib/app-data/` | connector demo |
| `src/lib/multiplayer/` | P2P preview |
| `src/routeTree.gen.ts` | TanStack (если есть) |

**Действующее из lib:** только `src/lib/utils.ts`.

Удаление недействующего (опционально):

```bash
rm -rf src/lib/auth src/lib/app-data src/lib/multiplayer
rm -f src/routeTree.gen.ts
```
