# План оптимизации — Спасибо много

Обновлено: 17.11.2026 (после восстановления store)

## Текущий статус
- Протокол стабилен (test:canon 48/48).
- `src/ui/store.ts` и `src/storage/history-db.ts` полностью восстановлены из коммита 06d5733.
- `npm run typecheck` — 0 ошибок.
- 10 moderate уязвимостей в зависимостях (в основном dev-tools: c8, eslint, glob/minimatch).
- Release-APK требует настройки подписи вне репозитория.

## Ближайшие шаги (выполнять по порядку)
1. ✅ Восстановить полные версии `src/ui/store.ts` и `src/storage/history-db.ts`.
2. ✅ Исправить ошибки `npm run typecheck`.
3. Проанализировать `npm audit` и закрыть moderate в production-зависимостях (если появятся). Dev-tools можно оставить с обоснованием.
4. Добавить минимум тестов для UI-store (импорт/экспорт History, создание M1, PIN-сессия).
5. Настроить release-подпись и собрать первый не-debug APK (versionCode +1).
6. Прогнать сценарий обмена QR на двух физических устройствах и зафиксировать результат в CHANGELOG.

## Метрики успеха
- `npm run test:canon` — 100% pass.
- `npm run typecheck` — 0 ошибок.
- `npm audit` — 0 high/critical; moderate в production закрыты или обоснованы.
- CI зелёный на main.
- Release-APK без `debuggable=true`.

См. также [README.md](README.md) и [CHANGELOG.md](CHANGELOG.md).
