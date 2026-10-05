# Чистка app-builder — выполнено (deps)

Продуктовый путь: **standalone** (`npm run dev:app` / `build:standalone`).

## Удалено из package.json

- better-auth, jose
- @electric-sql/pglite, kysely, pg
- nitro, все @tanstack/*
- 21× @radix-ui/*
- recharts, cmdk, vaul, react-day-picker, react-resizable-panels
- react-hook-form, @hookform/resolvers, zod, date-fns, sonner

## Оставлено (продукт)

@noble/*, @scure/bip39, cborg, jsqr, qrcode, zustand, react, lucide-react, tailwind*, capacitor*, cva/clsx

## Команды

```bash
npm install
npm run restore:store
npm run dev:app
npm run build:standalone
npm run test:canon
```

Legacy shell (`src/routes`, `src/lib/db.ts`) в дереве может остаться, но **не** в dependency graph продукта.
