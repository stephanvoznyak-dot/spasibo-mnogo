# Changelog

## 1.3.8 — 2026-10-10

- Кнопка **Скачать** — обычная ссылка: APK, HTML, исходники, проект Xcode. Браузер сохраняет файл сам, без загрузки в память.
- В установленном приложении и в офлайн-HTML ссылки ведут на GitHub Releases.
- На экране загрузки указано: APK с debug-подписью, не для Google Play.
- Android versionCode 9, iOS 1.3.8

## 1.3.7 — 2026-10-09

- Кнопка **Скачать** отдаёт файл сразу (APK, HTML, исходники, Xcode), запасной адрес — GitHub Releases
- Сборка APK в GitHub Actions: убран удалённый пакет SDK `tools`, JDK не привязан к пути песочницы
- Релиз: APK, офлайн HTML, ZIP исходников, проект Xcode
- Android versionCode 8, iOS 1.3.7

## 1.3.6 — 2026-10-05

- Кнопка **Скачать** в шапке: APK, HTML, исходники, проект Xcode
- Кнопки **Скачать** на входе, главной и в настройках
- Загрузки берут локальный файл или GitHub Releases
- Android `applicationId` выровнен: `org.normalproject.journal`, versionCode 7
- iOS: версия 1.3.6, разрешения камеры в Info.plist, архив Xcode
- `store.ts` восстановлен и лежит в репозитории
- GitHub Actions: HTML + APK + ZIP + Xcode на теге

## 1.3.5 — 2026-10-05

- MAX_CYCLE_STEPS=50_000 в `findCyclesFromState`
- Lab unlock: токен `lab-demo` + телефон (compat)
- `src/crypto/domain.ts` — префиксы domain separation (wire акта без изменений)
- PIN: meta storage, API; UI Settings (после restore store)
- DUAL_WRITE_LEGACY + history-first persistM1 (в store-with-pin)
- Android docs: debug ≠ release; versionName 1.3.5

**Внимание:** при сбое push `src/ui/store.ts` мог стать stub — восстановить из `store-with-pin.ts` / коммита `c59fce9e`.

## 1.3.4 — 2026-10-05

**Этап A — History:** M2-событие, атомарный append, write_down, export v2, C01–C13.

**Этап B-a — клиринг:** локальная гипотеза + подпись автора.

**Этап C (часть):** amount ≤ 10^12, bidi, test:canon, normal-project.

## 1.3.3 — 2026-10-03

Клиринг MAX_CYCLE_LEN=7; PROTOCOL нетто; iOS; телефон автора.

## 1.0.0 — 2026-09-22

Промышленный образец: BIP-39, Ed25519, CBOR, QR M1/M2, клиринг, рой, HTML/APK.
