# Спасибо много / Normal Project

Промышленный образец децентрализованного **личного** журнала взаимных обязательств.  
Не блокчейн, не кошелёк, не платёжная система.

**Протокол: normal-project v1.** Не совместим с EOS Specification v4.1  
(нет JCS, SLIP-0010, PAL). Не выдавайте записи журнала за SharedRecord EOS.

Репозиторий: [github.com/stephanvoznyak-dot/spasibo-mnogo](https://github.com/stephanvoznyak-dot/spasibo-mnogo)  
Релизы (APK / HTML / ZIP / Xcode): [releases](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases)  
Канал: [t.me/+buaSHWKuVTY2ZmNi](https://t.me/+buaSHWKuVTY2ZmNi)  
Автор концепции: **Ларионов Пётр** · +7 903 606-00-06 · [@Peterlarionov](https://t.me/Peterlarionov)

Версия **1.3.13** (22 октября 2026).

## Состояние проекта

- Основной промышленный образец концепта Normal Project в стеке Vite + React + Capacitor.
- Протокол реализован: BIP-39 → Ed25519, акты M1/M2, локальный клиринг циклов, офлайн QR-обмен.
- Связан с нативным Android-прототипом в репозитории [NormalProject](https://github.com/stephanvoznyak-dot/NormalProject) и формализациями на Lean 4 ([lean4-token-units-invariants](https://github.com/stephanvoznyak-dot/lean4-token-units-invariants)).
- Typecheck (`tsc --noEmit`) проходит. Lint: 0 errors, 5 warnings (react-refresh, exhaustive-deps).
- Канон-тесты (`npm run test:canon`) — **25/25 проходят** на Node 20 (через `tsx`).
- После чистой установки с `--legacy-peer-deps` и overrides для uuid npm audit показывает 0 уязвимостей.

**Последняя проверка (sandbox, 24.10.2026 ~17:20 MSK):** typecheck успешен, lint 0 errors / 5 warnings, test:canon 25/25 OK, npm audit 0 vulnerabilities. Состояние стабильно. См. [OPTIMIZATION.md](OPTIMIZATION.md).

## Скачать

| Файл | |
|------|--|
| Android APK | [normal-project.apk](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download/normal-project.apk) |
| Офлайн HTML | [normal-project.html](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download/normal-project.html) |
| Исходники ZIP | [normal-project-src.zip](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download/normal-project-src.zip) |
| Xcode / iOS | [normal-project-ios.zip](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases/latest/download/normal-project-ios.zip) · [IOS_BUILD.md](IOS_BUILD.md) |

В приложении кнопки **Скачать** на экране входа, на главной и в «Ещё».

## Что умеет

- Личность BIP-39 (12/24) → Ed25519
- Двусторонние акты (M1 + M2) как события History
- Обмен офлайн через QR
- **Локальный** клиринг циклов (подписанная гипотеза узла; не консенсус сторон)
- Рой между вкладками одного origin
- Полностью офлайн после загрузки
- Лаборатория: учебные контакты, 18-12-8, тесты F01–F08 и Canon 2.2

## История (источник истины)

```
act → m2 → clearing(author-signed) | write_down(migration)
State = deriveState(History)
```

Клиринг в UI: «локальный, не подтверждён контрагентами».

## Запуск

```
npm install --legacy-peer-deps
npm run restore:store
npm run dev
npm run test:canon   # 25 тестов, работает на Node 20+
```

## Сборки

- HTML: `npm run build:standalone` → `public/downloads/normal-project.html`
- Android: см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md) — debug APK не для магазина
- iOS / Xcode: `npm run setup:ios` затем `npx cap open ios` — [IOS_BUILD.md](IOS_BUILD.md)
- Пакет загрузок: `npm run pack:downloads`

## Документы

- [PROTOCOL.md](PROTOCOL.md) — форматы, History, локальный клиринг
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)
- [OPTIMIZATION.md](OPTIMIZATION.md) — план оптимизации

## Отказ от ответственности

Промышленный образец. Не финансовый продукт. Ответственность за сид-фразу и данные — на пользователе.
