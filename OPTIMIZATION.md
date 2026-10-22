# OPTIMIZATION.md

**Дата анализа:** 22 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.12

## Текущее состояние (sandbox Node v20.20.2, подтверждено 22.10.2026)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно после чистой установки с `--legacy-peer-deps` (подтверждено в этой сессии).
- Канон-тесты (`npm run test:canon`) требуют **Node.js 22+** (флаг `--experimental-strip-types`). На Node 20 не запускаются.
- Lint (`npm run lint`): исправлены 3 error (пустой catch, prefer-const, control-regex с eslint-disable). Остались warnings.
- npm audit: **3 moderate** уязвимости (uuid через Capacitor/xcode) — подтверждено.
- Документация и связи с NormalProject, lean4-token-units-invariants, ya-ryadom актуальны.

## Приоритетный план оптимизации

### P0 — Безопасность (ближайшие 1–2 недели)
- [x] Оценить текущий audit после чистой установки (3 moderate).
- [ ] Зафиксировать или обновить оставшиеся moderate (uuid и зависимости Capacitor).
- [x] Добавить `npm audit --audit-level=moderate` в GitHub Actions (fail при high/critical).
- [x] Использовать `--legacy-peer-deps` в CI до разрешения peer-dep конфликтов.

### P1 — CI и тесты
- [x] Перевести test:canon на Node 22+ в workflow (matrix или обязательный runtime).
- [x] Сделать typecheck + test:canon обязательными перед релизом.
- [ ] Добавить базовый coverage report.
- [x] Линт (`npm run lint`) — ошибки исправлены в коде; рекомендуется добавить в CI.

### P1 — Документация и синхронизация
- [x] Обновить секцию «Состояние проекта» в README (учтено требование Node 22 и текущий audit).
- [x] Явно документировать соответствие с NormalProject и Lean-репозиторием (ссылки уже добавлены).
- [ ] Обновить ROADMAP.md при появлении новых целей.

### P2 — Сборка и релизы
- [x] Проверить release.yml на актуальность Node (22+)/Android/iOS.
- [ ] Оптимизировать размер APK (ProGuard/R8, исключение неиспользуемых ресурсов).
- [ ] Документировать минимальные требования (Node 22, Android SDK, Xcode).

### P2 — Код и архитектура
- [ ] Провести ревью offline-first и swarm-логики.
- [ ] Унифицировать каноническую сериализацию и domain separation между веб- и Android-версиями.
- [ ] Рассмотреть tree-shaking / lazy-loading тяжёлых UI-компонентов (Radix).

### P3 — Lean и формализация
- [ ] Синхронизировать `lean/` из NormalProject с lean4-token-units-invariants.
- [ ] Добавить (по возможности) CI-проверку Lean-сборки.

## Выполненные действия (22.10.2026)

- Проведён локальный анализ в sandbox: typecheck OK, audit 3 moderate, test:canon требует Node 22.
- Исправлены lint errors в коде (prefer-const, empty catch, control-regex).
- Обновлены ссылки и описание соответствия проектов в README.
- Добавлен CI workflow (.github/workflows/ci.yml) с typecheck, lint, test:canon на Node 22 и audit.
- release.yml обновлён для `--legacy-peer-deps` и добавлен audit step.
- Повторное подтверждение typecheck и audit в этой сессии анализа.

## Рекомендуемые следующие шаги

1. Зафиксировать оставшиеся moderate-уязвимости (uuid).
2. Добавить coverage report.
3. Оптимизировать размер APK.
4. После правок обновить CHANGELOG и версию при необходимости.

---

*Документ обновлён на основе локального анализа в sandbox (Node 20.20, clean install) 22 октября 2026. Обновляйте по мере выполнения пунктов.*

## Обновление анализа (22.10.2026, sandbox Node 20.20)

### Результаты локальной проверки
- Typecheck (`tsc --noEmit`): проходит успешно.
- Lint: 0 ошибок, 10 предупреждений (в основном react-refresh, unused-vars, exhaustive-deps).
- Audit (после `npm install --legacy-peer-deps`): 7 уязвимостей (3 moderate, 4 high).
  - high: braces/micromatch (vite-plugin-singlefile), vite (несколько).
  - moderate: uuid (через @capacitor/cli / xcode).
- Canon-тесты (`test:canon`): требуют Node.js ≥22 из-за `--experimental-strip-types`. На Node 20 не запускаются.
- Smoke-тест ya-ryadom: проходит.

### Выполненные правки
- Исправлены 2 error-уровня в ESLint (пустой catch и no-control-regex).
- Коммит: fix: resolve ESLint errors...

### Рекомендации
1. Обновить зависимости (особенно vite, uuid, Capacitor) для устранения high/moderate.
2. Добавить coverage в CI.
3. Рассмотреть миграцию на Node 22 в локальной разработке.
4. Оптимизация размера APK (ProGuard) остаётся актуальной.

