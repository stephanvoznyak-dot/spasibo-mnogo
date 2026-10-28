# OPTIMIZATION.md

**Дата анализа:** 26 октября 2026  
**Репозиторий:** spasibo-mnogo (основной промышленный образец Normal Project)  
**Версия на момент анализа:** 1.3.13

## Текущее состояние (подтверждено 28.10.2026 ~09:15 MSK в sandbox)

- Протокол normal-project v1 реализован (BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR).
- Typecheck (`tsc --noEmit`) проходит успешно.
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20+ через `tsx`.
- Lint (`npm run lint`): **0 ошибок, 0 предупреждений**.
- npm audit: **3 уязвимости** (1 critical, 2 low) в better-auth / @better-auth/* (GHSA-44jh-23m7-hpcf). Требуется обновление до better-auth@1.7.14+.
- Документация и связи с [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) актуальны.
- Связь с серией ya-ryadom (Mini App аренды жилья через Telegram) отмечена как отдельное направление.
- CI остаётся на Node 22 для совместимости с `@capacitor/cli` и `@tanstack/react-start`.

**Подтверждение в sandbox (28.10.2026 ~09:15 MSK):** клонирование, `npm install --legacy-peer-deps`, typecheck успешен, `test:canon` — 25/25 OK, lint — 0 errors / 0 warnings. Состояние стабильно, кроме новой уязвимости в better-auth.

## Приоритетный план оптимизации

### P0 — Безопасность
- [x] Audit после чистой установки.
- [x] Overrides для uuid и peer-deps.
- [x] Audit в GitHub Actions.
- [ ] Обновить better-auth до версии, закрывающей GHSA-44jh-23m7-hpcf (1.7.14+).

### P1 — CI и тесты
- [x] test:canon в CI.
- [x] typecheck + test:canon обязательны.
- [x] Coverage report (`c8` + `test:canon:coverage`).
- [x] Lint: 0 errors, 0 warnings.

### P1 — Документация
- [x] README и OPTIMIZATION.md синхронизированы.
- [ ] ROADMAP.md при новых целях (расширить).
- [ ] Coverage threshold в CI.

### P2 — Сборка и архитектура
- [ ] Оптимизация размера APK (ProGuard/R8).
- [ ] Ревью offline-first / swarm.
- [ ] Унификация сериализации с NormalProject.
- [ ] Tree-shaking / lazy-loading UI.

### P3 — Lean
- [ ] Синхронизация lean/ с lean4-token-units-invariants.
- [ ] CI для Lean (по возможности).

## Выполненные действия

- 23.10.2026: установка, typecheck, lint, test:canon 25/25, audit 0; добавлен coverage скрипт.
- 24.10.2026: повторная проверка в sandbox — все тесты проходят; исправлены ошибки типизации (импорты, PIN-аргументы, swarm API). Lint сокращён до 5 warnings.
- 24.10.2026 (вечерняя сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 5 warnings, audit 0.
- 25.10.2026: независимая проверка в sandbox — typecheck OK, test:canon 25/25, lint 0/5, состояние стабильно.
- 25.10.2026 (дополнительная независимая проверка): подтверждены typecheck, 25/25 canon-тестов, lint 0 errors / 5 warnings. Для ya-ryadom подтверждены typecheck bot/web и smoke-take (7/7).
- 25.10.2026 (эта сессия): повторная независимая проверка в sandbox — все показатели стабильны, документация актуализирована.
- 25.10.2026 (~17:20 MSK, эта сессия): независимая проверка typecheck, 25/25 тестов, lint 0/5, audit 0; README и OPTIMIZATION обновлены.
- 26.10.2026 (~10:20 MSK, эта сессия): независимая проверка в sandbox — typecheck OK, test:canon 25/25, lint 0/5, audit 0. Документация актуализирована.
- 26.10.2026 (~13:15 MSK, эта сессия): обнаружены и исправлены ошибки импорта (хуки из screens-helpers → screens-hooks). Typecheck восстановлен, test:canon 25/25, lint сокращён до 1 warning, audit 0. Документация актуализирована.
- 26.10.2026 (~15:30 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/1, audit 0. ya-ryadom typecheck + smoke 7/7 OK.
- 26.10.2026 (~17:30 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0 errors / 1 warning, audit 0. Состояние стабильно.
- 26.10.2026 (~18:25 MSK, эта сессия): исправлено последнее lint-warning (useCallback в ScanScreen). Typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована.
- 27.10.2026 (~10:20 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. README и OPTIMIZATION обновлены. Состояние стабильно.
- 27.10.2026 (~11:20 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована. Состояние стабильно.
- 27.10.2026 (~12:15 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована. Состояние стабильно.
- 27.10.2026 (~13:15 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована. Состояние стабильно.
- 27.10.2026 (~14:16 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована. Состояние стабильно.
- 27.10.2026 (~16:28 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0, audit 0. Документация актуализирована. Состояние стабильно.
- 27.10.2026 (~17:25 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0. Для ya-ryadom подтверждены typecheck bot/web и smoke-take (7/7). Документация актуализирована. Состояние стабильно.
- 28.10.2026 (~09:15 MSK, эта сессия): независимое подтверждение в sandbox — typecheck OK, test:canon 25/25, lint 0/0. Обнаружены новые уязвимости в better-auth (1 critical). Документация актуализирована.

## Следующие задачи (новые / продолжение)

1. **P0**: Обновить better-auth до версии ≥1.7.14 для закрытия critical уязвимости GHSA-44jh-23m7-hpcf.
2. P2: размер APK и ProGuard/R8 + ревью swarm (после адаптации API).
3. P3: синхронизация Lean-формализаций между репозиториями (spasibo-mnogo/lean и lean4-token-units-invariants).
4. P1: coverage threshold в CI + расширение ROADMAP.md.
5. Исследовать возможные интеграции с ya-ryadom (Telegram Mini App).
6. Добавить тесты для PIN-сессии и swarm-синхронизации.
7. Анализ соответствия кода и документации в серии ya-ryadom / telegram-x-ya-ryadom / ya-ryadom-android.
8. Обновить README во всех связанных репозиториях с актуальной датой проверки и перекрёстными ссылками.
9. Рассмотреть возможность перехода CI на Node 22 для полного соответствия требованиям пакетов (устранить EBADENGINE).
10. Проанализировать и оптимизировать размер standalone HTML и Android сборки.
11. Проверить и актуализировать пустые/минимальные репозитории (rozhki, -, другие).

---

*Актуализировано 28 октября 2026 ~09:15 MSK (подтверждение стабильного состояния, выявление уязвимости better-auth и обновление документации в sandbox).*
