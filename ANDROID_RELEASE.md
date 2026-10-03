# Сборка release-APK (обязательно перед раздачей)

В проверенном APK 1.2.0 были `debuggable=true` и подпись «Android Debug». Так раздавать нельзя.

## 1. Ключ подписи (один раз, хранить вне репозитория)
```
keytool -genkeypair -v -keystore spasibo-release.jks -alias spasibo \
  -keyalg RSA -keysize 4096 -validity 10000
```
Потеряете ключ или пароль — обновить приложение поверх установленного будет нельзя.

## 2. android/app/build.gradle
```
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("SPASIBO_KEYSTORE") ?: "../spasibo-release.jks")
      storePassword System.getenv("SPASIBO_STORE_PASS")
      keyAlias "spasibo"
      keyPassword System.getenv("SPASIBO_KEY_PASS")
    }
  }
  buildTypes {
    release {
      debuggable false
      minifyEnabled false
      signingConfig signingConfigs.release
    }
  }
}
```
`versionName` = `APP_VERSION` из `src/version.ts` (сейчас 1.3.3), `versionCode` увеличивать на 1 при каждом релизе.

## 3. Сборка
```
npm run build:standalone && npx cap sync android
cd android && ./gradlew assembleRelease
```

## 4. Проверка перед публикацией
```
apksigner verify --verbose --print-certs app-release.apk
aapt2 dump badging app-release.apk | grep -E "versionName|debuggable"   # debuggable быть не должно
```

## 5. Лишнее убрать (проверить на устройстве после удаления)
- `public/__grok/` (ассеты Grok) не должны попадать в `android-www`.
- Плагин `@capacitor/camera` не нужен: сканирование идёт через `getUserMedia`.
- Разрешение INTERNET приложению не нужно (всё грузится из assets): `<uses-permission android:name="android.permission.INTERNET" tools:node="remove" />`.
- Кнопки скачивания APK/ZIP внутри APK бесполезны (файлов в нём нет): скрывать в сборке для Android.
