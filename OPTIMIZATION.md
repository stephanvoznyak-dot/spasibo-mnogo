# OPTIMIZATION.md

**Дата анализа:** 26 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.13 (текущая 1.3.16)

## Текущее состояние (подтверждено 7 ноября 2026 ~12:25 MSK в sandbox)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно.
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20+ через `tsx`.
- Lint (`npm run lint`): **0 ошибок, 0 предупреждений**.
- npm audit: **10 moderate** уязвимостей в цепочке glob/minimatch (dev-dependencies, инструменты сборки/ESLint/c8). Частично исправлено через `npm audit fix` (было 12). better-auth 1.7.14 — критическая уязвимость закрыта. Остаток требует `--force` (breaking для c8).
- Документация и связи с [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) актуальны.
- Связь с серией ya-ryadom (Mini App аренды жилья через Telegram) отмечена как отдельное направление.
- CI остаётся на Node 22 для совместимости с `@capacitor/cli` и `@tanstack/react-start`.

**Подтверждение в sandbox (7.11.2026 ~12:25 MSK):** клонирование, `npm install --legacy-peer-deps`, typecheck успешен, `test:canon` — 25/25 OK, lint — 0/0. Состояние стабильно.

## Приоритетный план оптимизации

### P0 — Безопасность
- [x] Audit после чистой установки.
- [x] Overrides для uuid и peer-deps.
- [x] Audit в GitHub Actions.
- [x] Обновить better-auth до версии, закрывающей GHSA-44jh-23m7-hpcf (1.7.14).
- [x] Частично закрыть moderate-уязвимости glob/minimatch (`npm audit fix` — 12→10).

### P1 — CI и тесты
- [x] test:canon в CI.
- [x] typecheck + test:canon обязательны.
- [x] Coverage report (`c8` + `test:canon:coverage`).
- [x] Lint: 0 errors, 0 warnings.

### P1 — Документация
- [x] README и OPTIMIZATION.md синхронизированы.
- [ ] ROADMAP.md при новых целях (расширить).
- [ ] Coverage threshold в CI.

### P2 — Сборка и архитектура
- [ ] Оптимизация размера APK (ProGuard/R8).
- [ ] Ревью offline-first / swarm.
- [ ] Унификация сериализации с NormalProject.
- [ ] Tree-shaking / lazy-loading UI.

### P3 — Lean
- [ ] Синхронизация lean/ с lean4-token-units-invariants.
- [ ] CI для Lean (по возможности).

## Выполненные действия

- 23.10.2026: установка, typecheck, lint, test:canon 25/25, audit 0; добавлен coverage скрипт.
- 24.10.2026: повторная проверка в sandbox — все тесты проходят; исправлены ошибки типизации (импорты, PIN-аргументы, swarm API). Lint сокращён до 5 warnings.
- 28.10.2026 (~12:15 MSK): независимое подтверждение — typecheck OK, test:canon 25/25, lint 0/0, audit 0.
- 6.11.2026 (~10:30 MSK): подтверждение typecheck/lint/test:canon 25/25 OK. Обнаружены moderate-уязвимости в зависимостях сборки. Документация актуализирована. Созданы задачи на исправление audit и оптимизацию размера сборок.
- 7.11.2026 (~09:20 MSK): независимое подтверждение стабильности — typecheck, lint 0/0, test:canon 25/25 OK. Документация обновлена.
- 7.11.2026 (~12:25 MSK): повторное подтверждение в sandbox — все проверки успешны. Документация актуализирована.

## Следующие задачи (новые / продолжение)

1. **P0**: Закрыть moderate-уязвимости glob/minimatch (рассмотреть безопасный путь без --force или планируемый breaking).
2. P2: размер APK и ProGuard/R8 + ревью swarm.
3. P3: синхронизация Lean-формализаций между репозиториями.
4. P1: coverage threshold в CI + расширение ROADMAP.md.
5. Исследовать возможные интеграции с ya-ryadom.
6. Добавить тесты для PIN-сессии и swarm-синхронизации.
7. Анализ соответствия кода и документации в серии ya-ryadom.
8. Обновить README во всех связанных репозиториях с актуальной датой проверки и перекрёстными ссылками.
9. Рассмотреть переход CI на Node 22 (уже реализовано).
10. Проанализировать и оптимизировать размер standalone HTML и Android сборки.
11. Проверить и актуализировать пустые/минимальные репозитории (rozhki, -, другие).

**Новые задачи предложены в Issues (7 ноября 2026).**

---

*Актуализировано 7 ноября 2026 ~12:25 MSK. Проект в стабильном состоянии; продолжена работа по открытым пунктам плана оптимизации.*
