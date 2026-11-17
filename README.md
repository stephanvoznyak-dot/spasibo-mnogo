# Спасибо много (Spasibo Mnogo)

Личный журнал обязательств на базе протокола Normal Project (v1).  
BIP-39 мнемоника, Ed25519 подписи, QR-обмен актами M1/M2, локальный клиринг циклов, Capacitor для Android/iOS.

**Репозиторий:** https://github.com/stephanvoznyak-dot/spasibo-mnogo  
**Протокол:** см. [PROTOCOL.md](PROTOCOL.md)  
**Версия приложения:** 1.3.17 (см. [CHANGELOG.md](CHANGELOG.md))

> Несовместимо с EOS. Самостоятельный протокол normal-project v1.

## Текущее состояние (на 17.11.2026)

- **Протокол и криптография:** реализованы (см. `src/protocol/`, `src/crypto/`). Источник истины — append-only History. Клиринг — локальная гипотеза узла.
- **Тесты протокола (`npm run test:canon`):** проходят (48/48 на момент проверки).
- **UI / хранилище:** `src/ui/store.ts` и `src/storage/history-db.ts` в репозитории содержат плейсхолдеры. Для полноценной работы требуется восстановление через `node scripts/restore-store.mjs` (и аналоги при наличии). После восстановления typecheck имеет остаточные ошибки.
- **Сборка:** Capacitor + Android/iOS. Есть GitHub Actions для CI и релизов. Debug-APK не для продакшена (см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md)).
- **Зависимости:** при `npm install` обнаружены moderate уязвимости (10 шт.). Рекомендуется `npm audit` и аккуратное обновление.
- **Другие файлы:** `OPTIMIZATION.md` и `ROADMAP.md` — плейсхолдеры.

Проект находится в стадии стабилизации протокола (после спринта по ТЗ v1.4.0). Полная приёмка на физических устройствах и release-сборки ещё в процессе.

## Быстрый старт

```bash
git clone https://github.com/stephanvoznyak-dot/spasibo-mnogo.git
cd spasibo-mnogo
npm install --legacy-peer-deps
node scripts/restore-store.mjs          # восстановить полный store.ts
npm run test:canon                      # тесты протокола
npm run typecheck                       # проверка типов
npm run dev                             # локальная разработка (если среда поддерживает)
```

Для Android: см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md) и `npm run cap:sync:android`.  
Для iOS: см. [IOS_BUILD.md](IOS_BUILD.md).

## План оптимизации и следующие задачи

### Выполнено в этом шаге
- Восстановлен полный `store.ts` локально для анализа.
- Прогнаны тесты протокола (48/48 pass).
- Составлен настоящий README вместо плейсхолдера.

### Приоритетные задачи (P0/P1)
1. **Восстановить и зафиксировать полные исходники:** `store.ts`, `history-db.ts` и другие плейсхолдеры. Убрать остаточные ошибки typecheck.
2. **Закрыть moderate уязвимости:** `npm audit` + целевое обновление зависимостей (без ломающих изменений протокола).
3. **Расширить тестовое покрытие:** добавить тесты для UI-store, импорта/экспорта History, edge-cases клиринга.
4. **Release-сборки:** настроить подпись release-ключом (вне репозитория), увеличить versionCode, прогнать на двух физических устройствах (как указано в чейнджлоге).
5. **Документация:** заполнить `OPTIMIZATION.md` и `ROADMAP.md` конкретными пунктами. Добавить OpenAPI-подобное описание внутренних API при необходимости.
6. **CI:** убедиться, что `test:canon`, typecheck и lint проходят на каждом push. Добавить Dependabot (уже есть `.github/dependabot.yml`).

### Долгосрочные улучшения
- Структурированное логирование и метрики.
- Улучшение UX для онбординга и обмена QR между устройствами.
- Рассмотрение миграции части хранилища на более надёжный локальный сторедж (с сохранением инвариантов History).
- Связь с репозиторием `lean4-token-units-invariants` для формальных доказательств.

## Связанные проекты
- [ya-ryadom](https://github.com/stephanvoznyak-dot/ya-ryadom) — Mini App + Telegram-бот для аренды жилья (отдельный проект).
- [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) — ранний Android-прототип клиринга.
- [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) — формализация инвариантов в Lean 4.

## Лицензия и отказ от ответственности

Прототип. Не использовать в production без независимого аудита криптографии, протокола и безопасности хранения ключей.

---

*Обновлено автоматически на основе анализа репозитория, протокола и прогона тестов.*
