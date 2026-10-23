# OPTIMIZATION.md

**Дата анализа:** 23 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.13

## Текущее состояние (подтверждено 23.10.2026, повторная проверка)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно после чистой установки с `--legacy-peer-deps`.
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20+ через `tsx`.
- Lint (`npm run lint`): 0 ошибок, 6 предупреждений (react-refresh, exhaustive-deps).
- npm audit: **0** уязвимостей (overrides uuid >=11.1.1).
- Coverage (`npm run test:canon:coverage`): ~78.85% statements / 69.69% branches по модулям protocol/storage.
- Документация и связи с [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) актуальны.
- CI остаётся на Node 22 для совместимости с `@capacitor/cli` и `@tanstack/react-start`.

## Приоритетный план оптимизации

### P0 — Безопасность
- [x] Audit после чистой установки.
- [x] Overrides для uuid и peer-deps.
- [x] Audit в GitHub Actions.

### P1 — CI и тесты
- [x] test:canon в CI.
- [x] typecheck + test:canon обязательны.
- [x] Coverage report (`c8` + `test:canon:coverage`).
- [x] Lint: 0 errors (предупреждения сокращены).

### P1 — Документация
- [x] README и OPTIMIZATION.md синхронизированы.
- [ ] ROADMAP.md при новых целях.

### P2 — Сборка и архитектура
- [ ] Оптимизация размера APK (ProGuard/R8).
- [ ] Ревью offline-first / swarm.
- [ ] Унификация сериализации с NormalProject.
- [ ] Tree-shaking / lazy-loading UI.

### P3 — Lean
- [ ] Синхронизация lean/ с lean4-token-units-invariants.
- [ ] CI для Lean (по возможности).

## Выполненные действия (23.10.2026)

- Установка зависимостей, typecheck, lint, test:canon 25/25, audit 0.
- Добавлен скрипт `test:canon:coverage` (c8).
- Устранены unused imports → lint 6 warnings.
- package.json восстановлен с полной структурой и c8.

## Следующие задачи

1. P2: размер APK и ProGuard/R8.
2. P2: ревью swarm и унификация с Android-прототипом.
3. P3: синхронизация Lean-формализаций.
4. Issue для coverage threshold в CI и ROADMAP.

---

*Актуализировано 23 октября 2026.*
