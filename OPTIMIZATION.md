# OPTIMIZATION.md

**Дата анализа:** 25 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.13

## Текущее состояние (подтверждено 25.10.2026 в sandbox)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно.
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20+ через `tsx`.
- Lint (`npm run lint`): 0 ошибок, **5 предупреждений** (react-refresh/only-export-components, exhaustive-deps).
- npm audit: **0** уязвимостей (overrides uuid >=11.1.1).
- Документация и связи с [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) актуальны.
- Связь с серией ya-ryadom (Mini App аренды жилья через Telegram) отмечена как отдельное направление.
- CI остаётся на Node 22 для совместимости с `@capacitor/cli` и `@tanstack/react-start`.

**Подтверждение в sandbox (25.10.2026, независимая проверка):** клонирование, `npm install --legacy-peer-deps`, typecheck — успешно, `test:canon` — 25/25 OK, lint — 0 errors / 5 warnings. Состояние стабильно.

## Приоритетный план оптимизации

### P0 — Безопасность
- [x] Audit после чистой установки.
- [x] Overrides для uuid и peer-deps.
- [x] Audit в GitHub Actions.

### P1 — CI и тесты
- [x] test:canon в CI.
- [x] typecheck + test:canon обязательны.
- [x] Coverage report (`c8` + `test:canon:coverage`).
- [x] Lint: 0 errors (предупреждения сокращены до 5).

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
- 24.10.2026 (вечерняя сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 5 warnings, audit 0.
- 25.10.2026: независимая проверка в sandbox — typecheck OK, test:canon 25/25, lint 0/5, состояние стабильно.
- 25.10.2026 (дополнительная независимая проверка): подтверждены typecheck, 25/25 canon-тестов, lint 0 errors / 5 warnings. Для ya-ryadom подтверждены typecheck bot/web и smoke-take (7/7).

## Следующие задачи (новые)

1. P2: размер APK и ProGuard/R8 + ревью swarm (после адаптации API).
2. P3: синхронизация Lean-формализаций между репозиториями.
3. P1: coverage threshold в CI + расширение ROADMAP.md.
4. Исследовать возможные интеграции с ya-ryadom (Telegram Mini App).
5. Устранить оставшиеся 5 lint-предупреждений (react-refresh, exhaustive-deps).
6. Добавить тесты для PIN-сессии и swarm-синхронизации.
7. Анализ соответствия кода и документации в серии ya-ryadom / telegram-x-ya-ryadom.
8. Обновить README во всех связанных репозиториях с актуальной датой проверки и перекрёстными ссылками.

---

*Актуализировано 25 октября 2026 (независимое подтверждение тестов в sandbox).*
