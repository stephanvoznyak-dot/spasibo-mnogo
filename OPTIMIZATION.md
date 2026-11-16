# OPTIMIZATION.md

## Текущий статус (16 ноября 2026, ~11:30 MSK)

Проект стабилен. Канон-тесты и покрытие без изменений. Повторная проверка в сандбоксе подтвердила все метрики.

- Typecheck (`tsc --noEmit`) — **успешно**.
- Lint (`eslint .`) — **0 errors, 0 warnings**.
- Канон-тесты (`npm run test:canon`) — **47/47 проходят**.
- Coverage (protocol/storage + pin-session): **87.58% statements / 78.05% branches / 91.02% functions**.
- graph.ts покрытие **100% statements / 97.61% branches**.
- qr-messages.ts покрытие **88.52% / 78.94% branches**.
- Уязвимости в `better-auth` закрыты. `npm audit` показывает ~10 moderate (в основном typescript-eslint, glob/minimatch и связанные dev-deps); Dependabot настроен.
- Standalone build успешен (~631 KB).

**Исправления 13.11.2026 (~15:30 MSK):**
- `src/swarm/sync.ts`: замена `window.setInterval` / `window.clearInterval` на `globalThis` + проверка наличия, чтобы Node test runner не падал с `ReferenceError: window is not defined`.
- `src/swarm/sync.test.ts`: dummyAct теперь использует 32-байтные `from`/`to` (требование протокола), устранён `ProtocolError: Некорректное поле from` при возможном decode.
- Моки `window` в тестах сохранены; код production стал environment-agnostic для таймеров.

Состояние соответствует заявленному. Документация актуализирована.

## План оптимизации (актуализирован)

### Высокий приоритет

- [x] Добавить coverage threshold в CI (`.github/workflows/ci.yml`) на основе `npm run test:canon:coverage`. **Выполнено 8.11.2026.**
- [ ] Расширить тесты для PIN-сессии и swarm-синхронизации (PIN добавлен; swarm smoke-тесты стабилизированы для Node; требуется валидные подписанные Act и покрытие message path). См. Issue.
- [ ] Оптимизация размера APK: включить ProGuard/R8, проверить tree-shaking и assets. (Аудит standalone завершён: ~629 KB приемлемо.) См. Issue.
- [x] Включить Dependabot alerts и security scanning в CI. **Выполнено 9.11.2026: добавлен `.github/dependabot.yml`.**

### Средний приоритет

- [ ] Ревью offline-first / swarm (синхронизация между вкладками, конфликт-резолвинг).
- [ ] Синхронизация Lean-формализаций с репозиторием `lean4-token-units-invariants`.
- [ ] Анализ соответствия и возможной интеграции с серией `ya-ryadom` (Mini App / Android).

### Низкий приоритет / регулярное обслуживание

- [ ] Регулярный `npm audit` и обновление зависимостей (особенно Capacitor, Vite, React).
- [ ] Улучшение документации по сборке iOS/Android (проверка актуальности IOS_BUILD.md / ANDROID_RELEASE.md).
- [ ] Добавление E2E-тестов через Playwright для критических пользовательских сценариев.

## Новые задачи (обновлено 16 ноября 2026, ~11:30 MSK)

1. Доработать тесты swarm: использовать createSignedM1 + signM2 для валидных Act; покрыть ветки bitfield/have/want/piece; после стабилизации добавить `src/swarm/*.test.ts` в `test:canon`.
2. Провести `npm audit` и применить безопасные обновления (typescript-eslint / glob/minimatch и др.).
3. Начать прототип интеграционных тестов для офлайн QR-обмена и локального клиринга (используя существующие helpers).
4. Оптимизация APK и ревью swarm вынесены в Issues.

## Соответствие репозиториев

- **spasibo-mnogo**: основной веб/Capacitor образец (Vite + React + TS). Протокол normal-project v1, офлайн QR, локальный клиринг.
- **NormalProject**: нативный Android-прототип (Kotlin + Compose + Room). Тот же концепт взаимного клиринга на Ed25519, обмен через NP0/NP1.
- **lean4-token-units-invariants**: формализация инвариантов токенов/поставки на Lean 4 (supply preservation, unit precision). Концептуально связана, но не прямой код-генерации из протокола.
- **ya-ryadom** (и связанные): отдельный проект Mini App / Telegram для аренды жилья. Нет прямого кода-совпадения; возможна только идея локального JSON-store.

Различия: spasibo-mnogo — industrial sample с полным CI/тестами; NormalProject — ранний нативный прототип; Lean — математическая верификация отдельных свойств.

## История обновлений
- 16 ноября 2026 (~11:30 MSK): Повторная верификация в сандбоксе — typecheck/lint/test:canon 47/47 подтверждены. npm audit: ~10 moderate (dev). Состояние стабильно. Документация актуализирована. Задачи остаются открытыми.
- 16 ноября 2026 (~10:30 MSK): Повторная верификация в сандбоксе — typecheck/lint/test:canon 47/47, coverage 87.58/78.05/91.02 подтверждены. npm audit: 13 moderate (dev). Состояние стабильно. Документация актуализирована. Подготовлены формы Issues.
- 16 ноября 2026 (~09:30 MSK): Повторная верификация в сандбоксе — typecheck/lint/test:canon 47/47, coverage 87.58/78.05/91.02 подтверждены. npm audit: 13 moderate (dev). Состояние стабильно. Документация актуализирована. Задачи остаются открытыми.
