# ROADMAP

## Сделано (1.3.x)

- Canon History + deriveState; PIN; History-only
- Android сборки / versionCode
- Lean deps; `dev:app` = продукт
- **app-builder leftovers полностью удалены** (auth, app-data, multiplayer, routes…)
- Протокол normal-project v1: BIP-39 → Ed25519, M1/M2, локальный клиринг, офлайн QR
- Typecheck + 25/25 canon-тестов, lint 0 errors
- Coverage threshold в CI (≥70% lines/statements, ≥60% branches)
- Документация и связи с NormalProject / Lean формализациями

## В работе / приоритеты (8.11.2026)

- [ ] Расширить тесты для PIN-сессии и swarm-синхронизации
- [ ] Оптимизация размера APK (ProGuard/R8, tree-shaking, assets)
- [ ] Включить Dependabot alerts и security scanning в CI
- [ ] Ревью offline-first / swarm (синхронизация между вкладками, конфликт-резолвинг)
- [ ] Синхронизация Lean-формализаций с lean4-token-units-invariants
- [ ] Анализ соответствия серии ya-ryadom (Mini App / Android)
- [ ] Интеграционные тесты для QR-обмена и локального клиринга
- [ ] E2E-тесты (Playwright) для критических сценариев

## Отложено

| Пункт | |
|-------|--|
| ACT_VERSION 2 + domain на актах | ломает старые QR |
| B-б multi-party клиринг | отдельный протокол |

## Связанные направления

- **NormalProject** — нативный Android-прототип
- **lean4-token-units-invariants** — формализация инвариантов
- **ya-ryadom** / **ya-ryadom-android** / **telegram-x-ya-ryadom** — серия Mini App / Android для аренды жилья через Telegram

```bash
npm install --legacy-peer-deps && npm run restore:store && npm run dev
npm run test:canon
```

**Статус на 8 ноября 2026:** проект стабилен, документация синхронизирована с OPTIMIZATION.md. Новые задачи подготовлены к созданию в Issues.
