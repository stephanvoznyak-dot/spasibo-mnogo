# OPTIMIZATION.md

**Дата анализа:** 21 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.12

## Текущее состояние

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит.
- Канон-тесты (`npm run test:canon`) заявлены как 25/25 (требуют Node 22+ из-за `--experimental-strip-types`).
- npm audit: **7 уязвимостей** (3 moderate, 4 high). Основные источники: `@capacitor/cli` (xcode), `braces`/`micromatch` (stack exhaustion DoS), `uuid`.
- Документация (README, PROTOCOL.md, SECURITY.md, CHANGELOG.md, ANDROID_RELEASE.md, IOS_BUILD.md) актуальна и синхронизирована с релизами.
- Связанные репозитории: NormalProject (Kotlin/Android), lean4-token-units-invariants, ya-ryadom.

## Приоритетный план оптимизации

### P0 — Безопасность (ближайшие 1–2 недели)
- [ ] Обновить / зафиксировать high-severity: `braces`, `micromatch`, `uuid`.
- [ ] Оценить и запланировать обновление `@capacitor/*` (сейчас major-jump в fixAvailable).
- [ ] Добавить `npm audit --audit-level=high` в GitHub Actions (fail job при high/critical).
- [ ] Проверить и обновить `package-lock.json` после правок.

### P1 — CI и тесты
- [ ] Перевести test:canon на Node 22+ в workflow (или добавить matrix).
- [ ] Сделать typecheck + test:canon обязательными перед релизом.
- [ ] Добавить базовый coverage report.
- [ ] Линт (`npm run lint`) в CI.

### P1 — Документация и синхронизация
- [ ] Поддерживать секцию «Состояние проекта» в README в актуальном виде после каждого значимого изменения.
- [ ] Явно документировать соответствие с NormalProject и Lean-репозиторием.
- [ ] Обновить ROADMAP.md при появлении новых целей.

### P2 — Сборка и релизы
- [ ] Проверить release.yml на актуальность Node/Android/iOS.
- [ ] Оптимизировать размер APK (ProGuard/R8, исключение неиспользуемых ресурсов).
- [ ] Документировать минимальные требования (Node, Android SDK, Xcode).

### P2 — Код и архитектура
- [ ] Провести ревью offline-first и swarm-логики.
- [ ] Унифицировать каноническую сериализацию и domain separation между веб- и Android-версиями.
- [ ] Рассмотреть tree-shaking / lazy-loading тяжёлых UI-компонентов (Radix).

### P3 — Lean и формализация
- [ ] Синхронизировать `lean/` из NormalProject с lean4-token-units-invariants.
- [ ] Добавить (по возможности) CI-проверку Lean-сборки.

## Рекомендуемые следующие шаги

1. Создать ветку `security/deps-audit` и обновить high-severity зависимости.
2. Добавить audit + typecheck + tests в `.github/workflows/`.
3. После правок обновить секцию состояния в README и CHANGELOG.

---

*Документ создан автоматически на основе анализа репозитория. Обновляйте по мере выполнения пунктов.*
