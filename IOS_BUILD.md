# iOS / Xcode — сборка приложения «Спасибо много»

Пакет: `org.normalproject.journal`  
Имя на устройстве: **Спасибо много**  
Минимальная версия iOS: 15.0+ (рекомендуется 16+)

## Требования

- macOS с установленным **Xcode** (актуальная стабильная версия; для Capacitor 8 — Xcode 26.0+)
- Xcode Command Line Tools (`xcode-select --install`)
- Apple ID (для симулятора достаточно; для устройства и App Store — Apple Developer Program)
- Node.js 20+ и npm

С Capacitor 8 по умолчанию используется **Swift Package Manager (SPM)**. CocoaPods не обязателен.

## Быстрый старт (первый раз)

```bash
git clone https://github.com/stephanvoznyak-dot/spasibo-mnogo.git
cd spasibo-mnogo
npm install

# Добавить платформу iOS (создаёт папку ios/)
npx cap add ios

# Собрать веб-активы и синхронизировать
npm run build:standalone
npx cap sync ios

# Открыть в Xcode
npx cap open ios
```

После `npx cap add ios` в корне проекта появится папка `ios/`.

### Если нужен CocoaPods вместо SPM

```bash
npx cap add ios --packagemanager CocoaPods
cd ios/App && pod install && cd ../..
npx cap open ios
```

При использовании CocoaPods открывайте **App.xcworkspace**, а не `.xcodeproj`.

## Последующие сборки

```bash
npm run build:standalone
npx cap sync ios
npx cap open ios
```

Или скриптами из package.json:

```bash
npm run cap:sync:ios
npm run cap:open:ios
```

## Настройки в Xcode (обязательно)

1. Откройте проект через `npx cap open ios` (или вручную `ios/App/App.xcodeproj` при SPM / `ios/App/App.xcworkspace` при CocoaPods).
2. Выберите target **App** → вкладка **Signing & Capabilities**:
   - Team — ваша команда разработчика
   - Bundle Identifier — `org.normalproject.journal` (или свой уникальный)
3. Вкладка **General**:
   - Display Name: `Спасибо много`
   - Minimum Deployments: iOS 15.0 или выше
4. **Info.plist** (или Info tab) — добавьте разрешение камеры:

```xml
<key>NSCameraUsageDescription</key>
<string>Приложению требуется доступ к камере для сканирования QR-кодов актов обязательств.</string>
```

Без этого ключа камера не будет работать, и приложение может быть отклонено при публикации в App Store.

## Запуск

- **Симулятор**: выберите любой iPhone в списке устройств и нажмите ▶ Run.
- **Физический iPhone**:
  1. Подключите устройство кабелем.
  2. На iPhone: Настройки → Основные → VPN и управление устройством → доверьте компьютеру.
  3. В Xcode выберите ваше устройство и запустите.

## Публикация в App Store

1. В Xcode: Product → Archive.
2. После успешного архива откроется Organizer.
3. Distribute App → App Store Connect.
4. Заполните метаданные в App Store Connect (скриншоты, описание, возрастной рейтинг).
5. Отправьте на проверку.

Для TestFlight достаточно загрузить билд через Organizer.

## Важные технические замечания

- `webDir` в `capacitor.config.ts` указывает на `android-www`. Скрипт `build:standalone` заполняет эту папку и создаёт в ней `index.html` — она используется и для iOS.
- **Схема на iOS**: по умолчанию `capacitor://localhost`. Нельзя задавать `iosScheme: "http"` или `"https"` — WKWebView резервирует эти схемы для удалённых URL, Capacitor молча сбрасывает их обратно на `capacitor`.
- **crypto.subtle / Web Crypto**: на iOS схема `capacitor://localhost` является secure context. На Android для того же эффекта нужен `androidScheme: "https"` (уже задан).
- Плагины `@capacitor/camera`, `@capacitor/app`, `@capacitor/preferences` уже в dependencies. После `cap sync` они регистрируются нативно.
- Приватный ключ и мнемоника никогда не покидают устройство (см. SECURITY.md).
- Папка `android-www/` в `.gitignore` — её нужно собирать локально перед каждым `cap sync`.

## Типичные проблемы

| Проблема | Решение |
|----------|---------|
| `crypto.subtle` is undefined | На iOS обычно не связано со схемой. Пересоберите: `npm run build:standalone && npx cap sync ios`. Убедитесь, что не задан `iosScheme: "https"`. |
| Камера не открывается | Добавьте `NSCameraUsageDescription` в Info.plist |
| `No such module 'Capacitor'` | Открывайте правильный файл: `.xcodeproj` (SPM) или `.xcworkspace` (CocoaPods) |
| Ошибки зависимостей (CocoaPods) | `cd ios/App && pod install --repo-update` |
| Signing failed | Выберите правильную Team и Bundle Identifier |
| Белый экран / пустое приложение | Выполните `npm run build:standalone && npx cap sync ios` |
| Версии Capacitor не совпадают | `@capacitor/core`, `@capacitor/ios` и `@capacitor/cli` должны быть одной мажорной версии (сейчас 8.x) |
| Xcode слишком старый | Capacitor 8 требует Xcode 26.0+ |

## Структура после добавления iOS

```
spasibo-mnogo/
├── ios/                    ← генерируется `npx cap add ios`
│   └── App/
│       ├── App.xcodeproj   ← SPM (по умолчанию в Capacitor 8)
│       ├── App.xcworkspace ← только при CocoaPods
│       └── App/
│           └── Info.plist
├── android/
├── android-www/            ← веб-активы (генерируется build:standalone)
├── capacitor.config.ts
└── ...
```

После первого успешного `npx cap add ios` рекомендуется закоммитить папку `ios/` в репозиторий, чтобы другим разработчикам не пришлось выполнять `cap add` заново.
