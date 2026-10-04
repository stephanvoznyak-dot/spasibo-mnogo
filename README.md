# Спасибо много / Normal Project

Промышленный образец децентрализованного **личного** журнала взаимных обязательств.  
Не блокчейн, не кошелёк, не платёжная система.

**Протокол: normal-project v1.** Не совместим с EOS Specification v4.1  
(нет JCS, SLIP-0010, PAL). Не выдавайте записи журнала за SharedRecord EOS.

Репозиторий: [github.com/stephanvoznyak-dot/spasibo-mnogo](https://github.com/stephanvoznyak-dot/spasibo-mnogo)  
Релизы (APK / HTML / ZIP): [releases](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases)  
Канал: [t.me/+buaSHWKuVTY2ZmNi](https://t.me/+buaSHWKuVTY2ZmNi)  
Автор концепции: **Ларионов Пётр** · +7 903 606-00-06 · [@Peterlarionov](https://t.me/Peterlarionov)

Версия **1.3.3**.

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
npm install
npm run dev
npm run test:protocol
node --experimental-strip-types --test src/protocol/*.test.ts
```

## Сборки

- HTML: `npm run build:standalone` → `public/downloads/normal-project.html`
- Android: см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md) — **debug APK не для реального использования**
- iOS: [IOS_BUILD.md](IOS_BUILD.md)

## Документы

- [PROTOCOL.md](PROTOCOL.md) — форматы, History, локальный клиринг
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

## Отказ от ответственности

Промышленный образец. Не финансовый продукт. Ответственность за сид-фразу и данные — на пользователе.
