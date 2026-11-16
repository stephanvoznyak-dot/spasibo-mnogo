# ROADMAP

## Сделано (1.3.x)

- Canon History + deriveState; PIN; History-only
- Android сборки / versionCode
- Lean deps; `dev:app` = продукт
- **app-builder leftovers полностью удалены** (auth, app-data, multiplayer, routes…)
- Протокол normal-project v1: BIP-39 → Ed25519, M1/M2, локальный клиринг, офлайн QR
- Typecheck + **55/55** canon-тестов, lint **0 errors / 0 warnings**
- Coverage threshold в CI
- Документация и связи с NormalProject / Lean формализациями
- Исправление 3 unused-import warnings (16.11.2026)

## В работе / приоритеты (16.11.2026)

- [ ] Расширить и стабилизировать тесты swarm (валидные Act, message path); включить в `test:canon`
- [ ] Оптимизация размера APK (ProGuard/R8, tree-shaking, assets)
- [ ] Ревью offline-first / swarm (синхронизация между вкладками, конфликт-резолвинг)
- [ ] Синхронизация Lean-формализаций с lean4-token-units-invariants
- [ ] Анализ соответствия серии ya-ryadom (Mini App / Android)
- [ ] Интеграционные тесты для QR-обмена и локального клиринга
- [ ] E2E-тесты (Playwright) для критических сценариев
- [ ] Повышение покрытия storage/db.ts

## Отложено

| Пункт | Примечание |
|-------|------------|
| ACT_VERSION 2 + domain на актах | ломает старые QR |
| B-б multi-party клиринг | отдельный протокол |

## Связанные направления

- **NormalProject** — нативный Android-прототип
- **lean4-token-units-invariants** — формализация инвариантов
- **ya-ryadom** / **ya-ryadom-android** / **telegram-x-ya-ryadom** — серия Mini App / Android для аренды жилья через Telegram

```bash
npm install --legacy-peer-deps && npm run restore:store && npm run dev
npm run test:canon   # 55 тестов
```

**Статус на 16 ноября 2026 ~12:40 MSK:** проект стабилен. Typecheck / lint 0/0 / test:canon 55/55 подтверждены в песочнице. Документация синхронизирована с OPTIMIZATION.md. Основные открытые задачи: swarm-тесты, покрытие storage, APK-оптимизация, E2E.
