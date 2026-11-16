# OPTIMIZATION.md

## Текущий статус (16 ноября 2026, ~12:40 MSK)

Проект стабилен. Повторная проверка в песочнице подтвердила метрики и устранила 3 предупреждения eslint (unused imports).

- Typecheck (`tsc --noEmit`) — **успешно**.
- Lint (`eslint .`) — **0 errors, 0 warnings**.
- Канон-тесты (`npm run test:canon`) — **55/55 проходят**.
- Coverage (при `test:canon:coverage`): statements ~63% overall (включая низкопокрытый `db.ts`); core protocol: graph.ts **100%**, qr-messages.ts **~88.5%**, history.ts **~96.7%**, pin-session **100%**.
- Уязвимости в `better-auth` закрыты. `npm audit` показывает moderate в основном в dev-deps (typescript-eslint, glob/minimatch и связанные); Dependabot настроен.
- Standalone build ранее успешен (~631 KB).

**Исправления 16.11.2026 (~12:40 MSK):**
- Удалены/закомментированы неиспользуемые импорты: `deriveState` в `p0-audit.test.ts`, `historyFromActs` в `history-db.ts`, `deleteMeta` в `store.ts`. Lint теперь 0/0.
- Документация (README, OPTIMIZATION, ROADMAP) приведена в соответствие с фактическим числом тестов (55) и результатами прогона.

**Исправления 13.11.2026 (~15:30 MSK):**
- `src/swarm/sync.ts`: замена `window.setInterval` / `window.clearInterval` на `globalThis` + проверка наличия, чтобы Node test runner не падал с `ReferenceError: window is not defined`.
- `src/swarm/sync.test.ts`: dummyAct теперь использует 32-байтные `from`/`to` (требование протокола).

Состояние соответствует заявленному. Документация актуализирована.

## План оптимизации (актуализирован 16.11.2026)

### Высокий приоритет

- [x] Добавить coverage threshold в CI (`.github/workflows/ci.yml`) на основе `npm run test:canon:coverage`. **Выполнено 8.11.2026.**
- [ ] Расширить тесты для swarm-синхронизации: использовать `createSignedM1` + `signM2` для валидных Act; покрыть ветки bitfield/have/want/piece; после стабилизации включить `src/swarm/*.test.ts` в `test:canon`.
- [ ] Оптимизация размера APK: включить ProGuard/R8, проверить tree-shaking и assets. (Аудит standalone завершён: ~629–631 KB приемлемо.)
- [x] Включить Dependabot alerts и security scanning в CI. **Выполнено 9.11.2026.**

### Средний приоритет

- [ ] Ревью offline-first / swarm (синхронизация между вкладками, конфликт-резолвинг).
- [ ] Синхронизация Lean-формализаций с репозиторием `lean4-token-units-invariants`.
- [ ] Анализ соответствия и возможной интеграции с серией `ya-ryadom` (Mini App / Android). Идейная близость только в локальном JSON-store; прямого кода нет.
- [ ] Повысить покрытие `src/storage/db.ts` и `history-db.ts` (сейчас тянут общий % вниз).

### Низкий приоритет / регулярное обслуживание

- [ ] Регулярный `npm audit` и безопасные обновления зависимостей (особенно Capacitor, Vite, React, eslint).
- [ ] Улучшение документации по сборке iOS/Android (проверка актуальности IOS_BUILD.md / ANDROID_RELEASE.md).
- [ ] Добавление E2E-тестов через Playwright для критических пользовательских сценариев (создание акта, QR-обмен, локальный клиринг).

## Новые задачи (обновлено 16 ноября 2026, ~12:40 MSK)

1. Доработать тесты swarm: валидные подписанные Act + покрытие message path; включить в `test:canon`.
2. Провести `npm audit --production` и применить безопасные обновления; зафиксировать результат в CHANGELOG.
3. Начать прототип интеграционных тестов для офлайн QR-обмена и локального клиринга (helpers уже есть).
4. Вынести оптимизацию APK и ревью swarm в GitHub Issues.
5. Синхронизировать число тестов и coverage-цифры во всех docs после каждого значимого прогона.

## Соответствие репозиториев

- **spasibo-mnogo**: основной веб/Capacitor образец (Vite + React + TS). Протокол normal-project v1, офлайн QR, локальный клиринг. CI + 55 канон-тестов.
- **NormalProject**: нативный Android-прототип (Kotlin + Compose + Room). Тот же концепт взаимного клиринга на Ed25519.
- **lean4-token-units-invariants**: формализация инвариантов токенов/поставки на Lean 4. Концептуально связана.
- **ya-ryadom** (и связанные telegram-x-ya-ryadom, ya-ryadom-android): отдельный проект Mini App / Telegram для аренды жилья. Нет прямого кода-совпадения; возможна только идея локального JSON-store.

Различия: spasibo-mnogo — industrial sample с полным CI/тестами; NormalProject — ранний нативный прототип; Lean — математическая верификация отдельных свойств.

## История обновлений
- 16 ноября 2026 (~12:40 MSK): Верификация в песочнице — typecheck/lint 0/0/test:canon 55/55. Исправлены 3 eslint warnings. Документация синхронизирована. Покрытие core protocol высокое.
- 16 ноября 2026 (~11:30 MSK): Повторная верификация. Документация актуализирована.
- 13 ноября 2026: Исправления swarm для Node test runner.
