# Чистка app-builder (этап)

Продуктовый путь: **standalone** (HTML/APK), не TanStack Start + Nitro.

## Уже не нужно для «Спасибо много»

| Пакет / каталог | Зачем был | Статус |
|-----------------|-----------|--------|
| better-auth, jose | OAuth preview | не используется продуктом |
| @electric-sql/pglite, kysely, pg | PGLite/Neon todos | не журнал актов |
| nitro, @tanstack/react-start | SSR deploy | только `npm run dev` shell |
| 21× @radix-ui/* | shadcn kit | UI: button + input без Radix |
| recharts, cmdk, vaul, react-day-picker | demos | не нужны |
| server/middleware | PWA popup | пустой каркас |

## Команды продукта

```bash
npm run restore:store   # Canon store
npm run dev:app         # UI без app-builder
npm run build:standalone
npm run test:canon
```

## Следующий PR (удаление deps)

1. Убедиться `npm run dev:app` и `build:standalone` зелёные.
2. Убрать из `package.json` список выше.
3. Упростить `vite.config.ts` → только если нужен legacy shell.
4. Удалить `src/lib/db.ts` migrations, auth routes — после grep.

Не удалять: `@noble/*`, `@scure/bip39`, `cborg`, `jsqr`, `qrcode`, `zustand`, `capacitor*`.
