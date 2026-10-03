# Спасибо много / Normal Project

Промышленный образец личного журнала взаимных обязательств.  
Не блокчейн, не кошелёк, не платёжная система.

Репозиторий: [github.com/stephanvoznyak-dot/spasibo-mnogo](https://github.com/stephanvoznyak-dot/spasibo-mnogo)  
Релизы (APK / HTML / ZIP): [github.com/stephanvoznyak-dot/spasibo-mnogo/releases](https://github.com/stephanvoznyak-dot/spasibo-mnogo/releases)  
Канал: [t.me/+buaSHWKuVTY2ZmNi](https://t.me/+buaSHWKuVTY2ZmNi)  
Автор концепции: **Ларионов Пётр** · +7 903 606-00-06 · [@Peterlarionov](https://t.me/Peterlarionov)

Версия **1.3.2**.

## Что умеет

- Личность BIP-39 (12/24 слова) → Ed25519
- Двусторонние акты (M1 + M2) с каноническим CBOR и SHA-256
- Обмен офлайн через QR (живая камера, снимок, ручной ввод)
- Многосторонний клиринг циклов: остаток = min цикла, нетто-позиции узлов не меняются
- Рой между вкладками (`bitfield / have / want / piece`)
- Полностью офлайн после загрузки
- Лаборатория (код `+79036060006`): учебные контакты, треугольник 18-12-8, тесты F01–F08

## Запуск веб-версии

```
npm install
npm run dev
```

Протокол:

```
npm run test:protocol
```

## Самодостаточный HTML

```
npm run build:standalone
```

Файл: `public/downloads/normal-project.html`

## Android APK

Пакет: `org.normalproject.journal` · minSdk 26 (Android 8.0) · CAMERA.  
Имя на устройстве: **Спасибо много**.

```
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
npm run build:standalone
npx cap copy android
cd android && ./gradlew assembleDebug
```

`androidScheme: "https"` обязателен: без него `crypto.subtle` и камера в WebView не работают.

Готовый debug APK — во вкладке Releases и в приложении: **Ещё → Скачать APK**.

## Документы

- [PROTOCOL.md](PROTOCOL.md) — форматы, клиринг, рой
- [SECURITY.md](SECURITY.md) — модель угроз
- [CHANGELOG.md](CHANGELOG.md)

## Отказ от ответственности

Промышленный образец. Не является финансовым продуктом. Пользователь несёт ответственность за сид-фразу и данные.
