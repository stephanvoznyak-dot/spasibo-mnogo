# Сборка release-APK (обязательно перед раздачей)

В проверенном APK 1.2.0 были `debuggable=true` и подпись «Android Debug». Так раздавать нельзя.

**Debug-сборки** помечайте в UI/README крупно: «НЕ ДЛЯ ПРОДАКШЕНА / DEBUG».

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
    debug {
      debuggable true
      // Не публиковать debug APK как «релиз»
    }
  }
}
```
`versionName` = `APP_VERSION` из `src/version.ts` (**1.3.8**), `versionCode` увеличивать на 1 при каждом релизе (сейчас 9).

## 3. Сборка
```
npm run build:standalone && npx cap sync android
cd android && ./gradlew assembleRelease
```

## 4. Проверка перед публикацией
- `aapt dump badging app-release.apk | grep debuggable` → не должно быть `debuggable='true'`
- Подпись release, не Android Debug
- versionName совпадает с APP_VERSION
