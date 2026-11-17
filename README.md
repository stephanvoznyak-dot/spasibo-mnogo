# Спасибо много (Spasibo Mnogo)

Личный журнал обязательств на базе протокола Normal Project (v1).  
BIP-39 мнемоника, Ed25519 подписи, QR-обмен актами M1/M2, локальный клиринг циклов, Capacitor для Android/iOS.

**Репозиторий:** https://github.com/stephanvoznyak-dot/spasibo-mnogo  
**Протокол:** см. [PROTOCOL.md](PROTOCOL.md)  
**Версия приложения:** 1.3.17 (см. [CHANGELOG.md](CHANGELOG.md))

> Несовместимо с EOS. Самостоятельный протокол normal-project v1.

## Текущее состояние (на 17.11.2026)

- **Протокол и криптография:** реализованы и стабильны (`src/protocol/`, `src/crypto/`). Источник истины — append-only History. Клиринг — локальная гипотеза узла.
- **Тесты протокола (`npm run test:canon`):** 48/48 проходят.
- **UI / хранилище:** `src/ui/store.ts` и `src/storage/history-db.ts` восстановлены из рабочего коммита 06d5733. `npm run typecheck` проходит без ошибок.
- **Сборка:** Capacitor + Android/iOS. Есть GitHub Actions для CI и релизов. Debug-APK не для продакшена (см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md)).
- **Зависимости:** 10 moderate уязвимостей, в основном в dev-инструментах (c8, eslint, glob). Production-зависимости чисты. Рекомендуется периодический `npm audit`.
- **Документация:** README, OPTIMIZATION.md, ROADMAP.md синхронизированы с текущим состоянием.

Проект находится в стадии стабилизации протокола и подготовки к release-сборкам и приёмке на физических устройствах.

## Быстрый старт

```bash
git clone https://github.com/stephanvoznyak-dot/spasibo-mnogo.git
cd spasibo-mnogo
npm install --legacy-peer-deps
npm run test:canon
npm run typecheck
npm run dev
```

Для Android: см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md).  
Для iOS: см. [IOS_BUILD.md](IOS_BUILD.md).

## Связанные проекты
- [ya-ryadom](https://github.com/stephanvoznyak-dot/ya-ryadom) — Mini App + Telegram-клиент
- [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) — ранний Android-прототип
- [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants) — формальные доказательства на Lean 4

## Лицензия и отказ от ответственности

Прототип. Не использовать в production без независимого аудита.
