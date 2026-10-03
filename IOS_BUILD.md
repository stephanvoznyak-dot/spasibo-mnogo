# iOS / Xcode — сборка приложения «Спасибо много»

Пакет: `org.normalproject.journal`  
Имя на устройстве: **Спасибо много**  
Минимальная версия iOS: 15.0+ (рекомендуется 16+)

## Требования

- macOS с установленным **Xcode** (для Capacitor 8 — **Xcode 26.0+**)
- Xcode Command Line Tools: `xcode-select --install`
- Apple ID (симулятор) или Apple Developer Program (устройство / App Store)
- Node.js 20+ и npm

С Capacitor 8 по умолчанию используется **Swift Package Manager (SPM)**. CocoaPods не обязателен.

## Рекомендуемый способ (без ошибок в Xcode)

Одна команда выполняет сборку веб-активов, добавление платформы iOS, прописывание разрешений камеры в Info.plist и синхронизацию:

```bash
git clone https://github.com/stephanvoznyak-dot/spasibo-mnogo.git
cd spasibo-mnogo
npm install
npm run setup:ios
npx cap open ios
```

Скрипт `scripts/setup-ios.mjs`:

1. Проверяет наличие `@capacitor/ios`
2. Запускает `build:standalone` → заполняет `android-www/` (в т.ч. `index.html`)
3. При отсутствии папки `ios/` выполняет `npx cap add ios`
4. Автоматически добавляет в Info.plist:
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription`
   - `NSPhotoLibraryAddUsageDescription`
5. Выполняет `npx cap sync ios`

После открытия Xcode остаётся **только** выбрать Team в Signing & Capabilities.

## Ручной способ (эквивалент)

```bash
npm install
npx cap add ios
npm run build:standalone
npx cap sync ios
# затем вручную добавить ключи камеры в Info.plist
npx cap open ios
```

### CocoaPods вместо SPM

```bash
npx cap add ios --packagemanager CocoaPods
cd ios/App && pod install && cd ../..
npm run setup:ios   # или cap sync после build:standalone
npx cap open ios    # откроет App.xcworkspace
```

## Повторные сборки

```bash
npm run setup:ios
# или только обновление веб-части:
npm run cap:sync:ios
npx cap open ios
```

## Настройки в Xcode (единственный ручной шаг)

1. Target **App** → **Signing & Capabilities**
   - Team — ваша команда
   - Bundle Identifier — `org.normalproject.journal` (или свой)
2. **General** → Minimum Deployments: **iOS 15.0+**
3. Display Name уже «Спасибо много»

Разрешения камеры в Info.plist выставляет `setup:ios` — вручную добавлять не нужно.

## Запуск

- **Симулятор**: iPhone в списке устройств → ▶ Run
- **Устройство**: кабель → доверие на iPhone → выбрать устройство → Run

## Публикация

Product → Archive → Distribute App → App Store Connect / TestFlight.

## Технические замечания

| Тема | Как сделано |
|------|-------------|
| webDir | `android-www` — общий для Android и iOS, заполняется `build:standalone` |
| Схема iOS | `capacitor://localhost` (по умолчанию). **Не** ставить `iosScheme: "https"` — WKWebView это запрещает |
| crypto.subtle | На iOS secure context даёт `capacitor://`. На Android — `androidScheme: "https"` |
| Плагины | `@capacitor/camera`, `app`, `preferences` уже в package.json |
| android-www | в `.gitignore` — всегда собирать перед sync |

## Типичные ошибки и решения

| Ошибка | Решение |
|--------|---------|
| Белый экран | `npm run setup:ios` (нет index.html в webDir) |
| Missing NSCameraUsageDescription | `npm run setup:ios` (патчит Info.plist) |
| No such module 'Capacitor' | SPM: открывать `.xcodeproj`; CocoaPods: `.xcworkspace` |
| Signing failed | Выбрать Team в Xcode |
| Xcode version too old | Обновить до Xcode 26.0+ |
| Версии Capacitor разъехались | `@capacitor/core`, `ios`, `cli` — все 8.x |
| crypto.subtle undefined | Не задавать `iosScheme: "https"`; пересобрать setup:ios |

## Структура после setup:ios

```
spasibo-mnogo/
├── ios/                 ← создаётся автоматически
│   └── App/
│       ├── App.xcodeproj
│       └── App/Info.plist   ← с ключами камеры
├── android-www/         ← веб-сборка
├── scripts/setup-ios.mjs
└── capacitor.config.ts
```

После первого успешного `setup:ios` папку `ios/` можно закоммитить, чтобы коллегам не выполнять `cap add` повторно.
