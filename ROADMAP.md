# ROADMAP

## Сделано (1.3.4 → 1.3.5)

- **A** History: act → m2 → clearing | write_down; атомарный append; миграция
- **B-a** Клиринг = локальная гипотеза + подпись автора
- **C** limits (10¹², bidi), protocol tests, MAX_CYCLE_LEN=7, **MAX_CYCLE_STEPS=50_000**
- Lab: `lab-demo` + телефон автора (compat)
- Domain prefixes задокументированы в `src/crypto/domain.ts` (ACT_VERSION 1 без смены wire)
- PIN API + UI-заготовки; dual-write флаг `DUAL_WRITE_LEGACY`
- UI modules + clearingLocalHint

## Критично (сделать сейчас)

### Восстановить `src/ui/store.ts`
После сбоя push файл на main — stub. Полные варианты в артефактах проекта:
- `store-with-pin.ts` — с PIN lock/unlock + history-first persist
- `store-base.ts` — до PIN

```bash
cp store-with-pin.ts src/ui/store.ts   # из артефактов сессии
# или git show c59fce9e:src/ui/store.ts > src/ui/store.ts
git add src/ui/store.ts && git commit -m "restore store.ts"
```

## Ещё открыто

| Пункт | Статус |
|-------|--------|
| PIN UI wired to full store | после restore store |
| Dual-write off (`DUAL_WRITE_LEGACY=false`) | после 1–2 релизов только-History |
| Чистка app-builder / vite standalone-only | отдельный PR |
| Domain separation ACT_VERSION=2 | ломает старые акты |
| B-б многосторонний клиринг | отдельный протокол |
| Общий openDb | низкий приоритет |
