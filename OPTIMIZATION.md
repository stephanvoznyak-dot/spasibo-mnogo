# OPTIMIZATION.md

**Дата анализа:** 21 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.12

## Текущее состояние

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит на Node 20+.
- Канон-тесты (`npm run test:canon`) требуют **Node.js 22+** (флаг `--experimental-strip-types`). На Node 20 не запускаются.
- npm audit после `npm install --legacy-peer-deps`: **3 moderate** уязвимости (ранее было 7, включая 4 high). Основные high-проблемы с braces/micromatch/vite обойдены или исправлены при чистой установке.
- Документация актуальна. Связанные репозитории: NormalProject (Kotlin/Android прототип), lean4-token-units-invariants, ya-ryadom.

## Приоритетный план оптимизации

### P0 — Безопасность (ближайшие 1–2 недели)
- [x] Оценить текущий audit после чистой установки (3 moderate).
- [ ] Зафиксировать или обновить оставшиеся moderate (uuid и зависимости Capacitor).
- [ ] Добавить `npm audit --audit-level=moderate` в GitHub Actions (fail при high/critical).
- [ ] Использовать `--legacy-peer-deps` в CI до разрешения peer-dep конфликтов.

### P1 — CI и тесты
- [ ] Перевести test:canon на Node 22+ в workflow (matrix или обязательный runtime).
- [ ] Сделать typecheck + test:canon обязательными перед релизом.
- [ ] Добавить базовый coverage report.
- [ ] Линт (`npm run lint`) в CI.

### P1 — Документация и синхронизация
- [x] Обновить секцию «Состояние проекта» в README (учтено требование Node 22 и текущий audit).
- [ ] Явно документировать соответствие с NormalProject и Lean-репозиторием (ссылки уже добавлены).
- [ ] Обновить ROADMAP.md при появлении новых целей.

### P2 — Сборка и релизы
- [ ] Проверить release.yml на актуальность Node (22+)/Android/iOS.
- [ ] Оптимизировать размер APK (ProGuard/R8, исключение неиспользуемых ресурсов).
- [ ] Документировать минимальные требования (Node 22, Android SDK, Xcode).

### P2 — Код и архитектура
- [ ] Провести ревью offline-first и swarm-логики.
- [ ] Унифицировать каноническую сериализацию и domain separation между веб- и Android-версиями.
- [ ] Рассмотреть tree-shaking / lazy-loading тяжёлых UI-компонентов (Radix).

### P3 — Lean и формализация
- [ ] Синхронизировать `lean/` из NormalProject с lean4-token-units-invariants.
- [ ] Добавить (по возможности) CI-проверку Lean-сборки.

## Рекомендуемые следующие шаги

1. Обновить GitHub Actions workflow для Node 22 и `npm ci --legacy-peer-deps`.
2. Добавить audit step.
3. Проверить и зафиксировать оставшиеся moderate-уязвимости.
4. После правок обновить CHANGELOG и версию.

---

*Документ обновлён на основе локального анализа (Node 20.20, clean install). Обновляйте по мере выполнения пунктов.*
