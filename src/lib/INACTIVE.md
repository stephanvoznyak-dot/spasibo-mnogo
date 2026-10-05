# НЕДЕЙСТВУЮЩЕЕ / INACTIVE

Каталоги ниже **не входят** в продукт «Спасибо много».

| Путь | Было | Статус |
|------|------|--------|
| `src/lib/auth/` | better-auth / OAuth shell | **недействующее** |
| `src/lib/app-data/` | connector / readiness demo | **недействующее** |
| `src/lib/multiplayer/` | P2P preview (частично удалён) | **недействующее** |
| `src/routeTree.gen.ts` | TanStack route tree | **недействующее** (если ещё есть) |

## Действующее

- `src/lib/utils.ts` — `cn()` для button/input (**нужно**)
- `src/ui/`, `src/protocol/`, `src/storage/`, `src/crypto/`, `src/swarm/`
- `src/standalone.tsx` + `standalone.html`

Сборка продукта: `npm run dev:app` / `npm run build:standalone`.
Не импортируйте `@/lib/auth` и `@/lib/app-data`.
