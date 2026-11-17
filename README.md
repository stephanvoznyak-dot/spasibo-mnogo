# Спасибо много (Spasibo Mnogo)

Личный журнал обязательств на базе протокола Normal Project (v1).  
BIP-39 мнемоника, Ed25519 подписи, QR-обмен актами M1/M2, локальный клиринг циклов, Capacitor для Android/iOS.

**Репозиторий:** https://github.com/stephanvoznyak-dot/spasibo-mnogo  
**Протокол:** см. [PROTOCOL.md](PROTOCOL.md)  
**Версия приложения:** 1.3.17 (см. [CHANGELOG.md](CHANGELOG.md))

> Несовместимо с EOS. Самостоятельный протокол normal-project v1.

## Текущее состояние (на 17.11.2026)

- **Протокол и криптография:** реализованы (см. `src/protocol/`, `src/crypto/`). Источник истины — append-only History. Клиринг — локальная гипотеза узла.
- **Тесты протокола (`npm run test:canon`):** проходят (48/48).
- **UI / хранилище:** `src/ui/store.ts` и `src/storage/history-db.ts` восстановлены. `npm run typecheck` проходит без ошибок.
- **Сборка:** Capacitor + Android/iOS. Есть GitHub Actions для CI и релизов. Debug-APK не для продакшена (см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md)).
- **Зависимости:** при `npm install` обнаружены moderate уязвимости. Рекомендуется `npm audit` и аккуратное обновление.
- **Другие файлы:** `OPTIMIZATION.md` и `ROADMAP.md` заполнены актуальным планом.

Проект находится в стадии стабилизации протокола. Полная приёмка на физических устройствах и release-сборки ещё в процессе.

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
- [ya-ryadom](https://github.com/stephanvoznyak-dot/ya-ryadom)
- [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject)
- [lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants)

## Лицензия и отказ от ответственности

Прототип. Не использовать в production без независимого аудита.
