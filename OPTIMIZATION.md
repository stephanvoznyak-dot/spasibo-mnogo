# План оптимизации — Спасибо много

Обновлено: 18.11.2026 (после проверки тестов, сборки и lint)

## Текущий статус
- Протокол стабилен (test:canon **57/57**).
- `src/ui/store.ts` и `src/storage/history-db.ts` восстановлены.
- `npm run typecheck` — 0 ошибок.
- `npm run lint` — 0 errors, 0 warnings (исправлены unused imports).
- `npm run build` успешен.
- 21 уязвимость (9 moderate, 12 high) — в основном dev-tools (c8, eslint, glob/minimatch). Production-зависимости без high/critical.
- Release-APK требует настройки подписи вне репозитория.

## Ближайшие шаги (выполнять по порядку)
1. ✅ Восстановить полные версии store и history-db.
2. ✅ Исправить ошибки typecheck и lint.
3. Проанализировать `npm audit` и закрыть/обосновать high/moderate в production (если появятся). Dev-tools можно оставить с обоснованием или обновить осторожно.
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
