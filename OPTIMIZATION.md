# План оптимизации — Спасибо много

Обновлено: 18.11.2026 (после локальной проверки, исправления lint и сборки)

## Текущий статус
- Протокол стабилен (test:canon **57/57**).
- `src/ui/store.ts` и `src/storage/history-db.ts` восстановлены.
- `npm run typecheck` — 0 ошибок.
- `npm run lint` — 0 errors, 0 warnings (устранён unused import `deleteMeta` в `src/ui/store.ts`).
- `npm run build` успешен.
- `npm audit --omit=dev` показывает 15 уязвимостей (2 moderate, 13 high) в транзитивных зависимостях (picomatch, minimatch, vite и связанные). Production-код приложения чист; уязвимости в инструментах сборки.
- Release-APK требует настройки подписи вне репозитория.

## Ближайшие шаги (выполнять по порядку)
1. ✅ Восстановить полные версии store и history-db.
2. ✅ Исправить ошибки typecheck и lint (включая unused imports).
3. Проанализировать `npm audit` и закрыть/обосновать high/moderate в production (если появятся). Dev-tools можно оставить с обоснованием или обновить осторожно. Текущие high — в build-tools.
4. Добавить минимум тестов для UI-store (импорт/экспорт History, создание M1, PIN-сессия).
5. Настроить release-подпись и собрать первый не-debug APK (versionCode +1).
6. Прогнать сценарий обмена QR на двух физических устройствах и зафиксировать результат в CHANGELOG.
7. Обновить документацию (README, ROADMAP) под актуальные метрики — выполнено.

## Метрики успеха
- `npm run test:canon` — 100% pass (текущий: 57/57).
- `npm run typecheck` — 0 ошибок.
- `npm run lint` — 0 warnings/errors.
- `npm audit` — 0 high/critical в production; moderate обоснованы.
- CI зелёный на main.
- Release-APK без `debuggable=true`.

См. также [README.md](README.md) и [CHANGELOG.md](CHANGELOG.md).
