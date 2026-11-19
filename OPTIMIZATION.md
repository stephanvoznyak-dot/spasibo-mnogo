# План оптимизации — Спасибо много

Обновлено: 19.11.2026 (проверка состояния, устранение lint-предупреждения)

## Текущий статус
- Протокол стабилен (test:canon **57/57**).
- `src/ui/store.ts` и `src/storage/history-db.ts` восстановлены.
- `npm run typecheck` — 0 ошибок.
- `npm run lint` — 0 errors, 0 warnings (устранён unused import `deleteMeta` в `src/ui/store.ts`).
- `npm run build` успешен.
- `npm audit --omit=dev` показывает 2 moderate уязвимости в транзитивных зависимостях сборки (minimatch/glob). Production-код приложения чист.
- Release-APK требует настройки подписи вне репозитория.

## Ближайшие шаги (выполнять по порядку)
1. ✅ Восстановить полные версии store и history-db.
2. ✅ Исправить ошибки typecheck и lint (включая unused imports).
3. ✅ Проанализировать `npm audit` — moderate в build-tools обоснованы, production чист. При возможности обновить осторожно.
4. Добавить минимум тестов для UI-store (импорт/экспорт History, создание M1, PIN-сессия).
5. Настроить release-подпись и собрать первый не-debug APK (versionCode +1).
6. Прогнать сценарий обмена QR на двух физических устройствах и зафиксировать результат в CHANGELOG.
7. ✅ Обновить документацию (README, ROADMAP, OPTIMIZATION) под актуальные метрики.

## Новые задачи
- Расширить покрытие тестами для `src/ui/store.ts` (критические пути: createAct, ingestQr, runClearing, PIN).
- Рассмотреть обновление транзитивных зависимостей для устранения moderate advisories (с проверкой сборки).
- Добавить e2e-сценарии для QR-обмена в CI (если возможно без физических устройств — mock).
- Документировать процесс подписи release-APK и подготовить шаблон keystore (без секретов в репо).
- Синхронизировать версии между spasibo-mnogo, NormalProject (Android) и lean4-token-units-invariants.

## Метрики успеха
- `npm run test:canon` — 100% pass (текущий: 57/57).
- `npm run typecheck` — 0 ошибок.
- `npm run lint` — 0 warnings/errors.
- `npm audit` — 0 high/critical в production; moderate обоснованы или закрыты.
- CI зелёный на main.
- Release-APK без `debuggable=true`.

См. также [README.md](README.md) и [CHANGELOG.md](CHANGELOG.md).
