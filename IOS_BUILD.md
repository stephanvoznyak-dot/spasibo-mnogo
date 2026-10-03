# iOS / Xcode — сборка приложения «Спасибо много»

Пакет: `org.normalproject.journal`  
Имя на устройстве: **Спасибо много**  
Минимальная версия iOS: 15.0+ (рекомендуется 16+)

## Требования

- macOS с установленным **Xcode** (актуальная стабильная версия из App Store)
- Apple ID (для симулятора достаточно; для устройства и App Store — Apple Developer Program)
- Node.js 20+ и npm
- CocoaPods (`sudo gem install cocoapods` или через Homebrew)

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

## Последующие сборки

```bash
npm run build:standalone
npx cap sync ios
npx cap open ios
```

Или одной командой:

```bash
npm run cap:sync:ios
npm run cap:open:ios
```

## Настройки в Xcode (обязательно)

1. Откройте `ios/App/App.xcworkspace` (не `.xcodeproj`).
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

Без этого ключа камера не будет работать, и приложение может быть отклонено при публикации.

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

- `webDir` в `capacitor.config.ts` указывает на `android-www`. Скрипт `build:standalone` заполняет эту папку — она используется и для iOS.
- `iosScheme: "https"` обеспечивает корректную работу `crypto.subtle` и Web Crypto API в WKWebView.
- Плагин `@capacitor/camera` уже подключён. После `cap sync` разрешения обрабатываются нативно.
- Приватный ключ и мнемоника никогда не покидают устройство (см. SECURITY.md).

## Типичные проблемы

| Проблема | Решение |
|----------|---------|
| `crypto.subtle` undefined | Проверьте `iosScheme: "https"` и пересоберите (`cap sync`) |
| Камера не открывается | Добавьте `NSCameraUsageDescription` в Info.plist |
| CocoaPods ошибки | `cd ios/App && pod install --repo-update` |
| Signing failed | Выберите правильную Team и Bundle ID |
| Белый экран | Выполните `npm run build:standalone && npx cap sync ios` |

## Структура после добавления iOS

```
spasibo-mnogo/
├── ios/                  ← генерируется `npx cap add ios`
│   └── App/
│       ├── App.xcworkspace
│       └── App/
│           └── Info.plist
├── android/
├── android-www/          ← веб-активы для обеих платформ
├── capacitor.config.ts
└── ...
```

После первого `npx cap add ios` рекомендуется закоммитить папку `ios/` в репозиторий, чтобы другие разработчики не выполняли `cap add` заново.
