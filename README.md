# Спасибо много / Normal Project

Промышленный образец децентрализованного личного журнала взаимных обязательств.  
Не блокчейн, не кошелёк, не платёжная система.

Репозиторий: [github.com/stephanvoznyak-dot/spasibo-mnogo](https://github.com/stephanvoznyak-dot/spasibo-mnogo)  
Релизы (APK / HTML / ZIP): [github.com/stephanvoznyak-dot/spasibo-mnogo/releases](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases)  
Канал: [t.me/+buaSHWKuVTY2ZmNi](https://t.me/+buaSHWKuVTY2ZmNi)  
Автор концепции: **Ларионов Пётр** · +7 903 606-00-06 · [@Peterlarionov](https://t.me/Peterlarionov)

Версия **1.3.3**.

## Что умеет

- Личность BIP-39 (12/24 слова) → Ed25519
- Двусторонние акты (M1 + M2) с каноническим CBOR и SHA-256
- Обмен офлайн через QR (живая камера, снимок, ручной ввод)
- Многосторонний клиринг циклов с сохранением нетто-позиций узлов
- Рой между вкладками (`bitfield / have / want / piece`)
- Полностью офлайн после загрузки
- Лаборатория (код `+79036060006`): учебные контакты, треугольник 18-12-8, тесты F01–F08

## Запуск веб-версии

```
npm install
npm run dev
```

Сборка:

```
npm run build
```

Юнит-тесты протокола:

```
npm run test:protocol
```

или

```
node --experimental-strip-types --test src/protocol/act.test.ts
```

## Самодостаточный HTML

```
npm run build:standalone
```

или

```
node scripts/build-standalone.mjs
```

Файл: `public/downloads/normal-project.html` (и копия в `android-www/`).

## Android APK

Пакет: `org.normalproject.journal` · minSdk 26 (Android 8.0) · CAMERA.  
Имя на устройстве: **Спасибо много**.

Сборка debug:

```
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
npm run build:standalone
npx cap copy android
cd android && ./gradlew assembleDebug
```

`androidScheme: "https"` обязателен: без него `crypto.subtle` и камера в WebView отваливаются.

Для распространения используйте только release-сборку (см. [ANDROID_RELEASE.md](ANDROID_RELEASE.md)).

Готовый debug APK: `public/downloads/normal-project.apk`  
В приложении: **Ещё → Скачать APK**.

## iOS (iPhone) — Xcode

Пакет: `org.normalproject.journal` · iOS 15+ · CAMERA.  
Имя на устройстве: **Спасибо много**.

На macOS с Xcode 26.0+:

```bash
npm install
npm run setup:ios
npx cap open ios
```

Скрипт сам соберёт веб-активы, создаст `ios/`, пропишет разрешения камеры в Info.plist и выполнит `cap sync`.  
В Xcode остаётся выбрать **Team** в Signing & Capabilities и нажать Run.

Подробности: [IOS_BUILD.md](IOS_BUILD.md).

## Документы

- [PROTOCOL.md](PROTOCOL.md) — форматы, клиринг, рой
- [SECURITY.md](SECURITY.md) — модель угроз
- [CHANGELOG.md](CHANGELOG.md)
- [ANDROID_RELEASE.md](ANDROID_RELEASE.md) — требования к release-APK
- [IOS_BUILD.md](IOS_BUILD.md) — сборка для iPhone / Xcode

## Отказ от ответственности

Промышленный образец. Не является финансовым продуктом. Пользователь несёт ответственность за сид-фразу и данные.
