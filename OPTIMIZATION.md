# OPTIMIZATION.md

**Дата анализа:** 23 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.13

## Текущее состояние (подтверждено 23.10.2026)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно после чистой установки с `--legacy-peer-deps`.
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20+ через `tsx`. Требование Node 22+ для `--experimental-strip-types` устарело.
- Lint (`npm run lint`): 0 ошибок, 10 предупреждений (react-refresh, unused-vars, exhaustive-deps).
- npm audit: **0** уязвимостей (после overrides для uuid >=11.1.1).
- Документация и связи с [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) актуальны.
- CI остаётся на Node 22 для совместимости с `@capacitor/cli` и `@tanstack/react-start`.

## Приоритетный план оптимизации

### P0 — Безопасность (ближайшие 1–2 недели)
- [x] Оценить текущий audit после чистой установки (3 moderate).
- [x] Зафиксировать или обновить оставшиеся moderate (uuid и зависимости Capacitor).
- [x] Добавить `npm audit --audit-level=moderate` в GitHub Actions (fail при high/critical).
- [x] Использовать `--legacy-peer-deps` в CI до разрешения peer-dep конфликтов.

### P1 — CI и тесты
- [x] Перевести test:canon на Node 22+ в workflow (matrix или обязательный runtime).
- [x] Сделать typecheck + test:canon обязательными перед релизом.
- [ ] Добавить базовый coverage report.
- [x] Линт (`npm run lint`) — ошибки исправлены; рекомендуется оставить в CI.

### P1 — Документация и синхронизация
- [x] Обновить секцию «Состояние проекта» в README (учтено: тесты на Node 20+, audit 0 после overrides).
- [x] Явно документировать соответствие с NormalProject и Lean-репозиторием.
- [ ] Обновить ROADMAP.md при появлении новых целей.

### P2 — Сборка и релизы
- [x] Проверить release.yml на актуальность Node / Android / iOS.
- [ ] Оптимизировать размер APK (ProGuard/R8, исключение неиспользуемых ресурсов).
- [ ] Документировать минимальные требования (Node 20+, Android SDK, Xcode).

### P2 — Код и архитектура
- [ ] Провести ревью offline-first и swarm-логики.
- [ ] Унифицировать каноническую сериализацию и domain separation между веб- и Android-версиями.
- [ ] Рассмотреть tree-shaking / lazy-loading тяжёлых UI-компонентов (Radix).

### P3 — Lean и формализация
- [ ] Синхронизировать `lean/` из NormalProject с lean4-token-units-invariants.
- [ ] Добавить (по возможности) CI-проверку Lean-сборки.

## Выполненные действия

### 22.10.2026
- Локальный анализ: typecheck OK, audit 3 moderate.
- Добавлен CI workflow (typecheck, lint, test:canon, audit).
- release.yml обновлён (`--legacy-peer-deps` + audit).

### 23.10.2026 (текущая сессия)
- Повторная проверка: typecheck OK, lint 0 errors / 10 warnings, test:canon 25/25, audit 0 (overrides uuid).
- Подтверждено, что `test:canon` работает на Node 20+ через `tsx`.
- README и OPTIMIZATION.md синхронизированы с актуальным состоянием.
- Устранены moderate уязвимости uuid через overrides; подготовлена задача P1 (coverage).

## Рекомендуемые следующие шаги

1. **P1**: добавить coverage report для `test:canon`.
2. **P2**: оптимизация размера APK (ProGuard/R8).
3. После значимых правок — обновить CHANGELOG и при необходимости версию.

---

*Документ актуализирован 23 октября 2026 по результатам sandbox-проверки.*
