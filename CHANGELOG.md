# Changelog

## 1.3.12 — 2026-10-19

- На iPhone кнопка больше не уводит приложение на пустую страницу. Ссылка копируется, файл можно сохранить вторым нажатием.
- Адрес файла показан в поле: его можно выделить и открыть в Safari.
- Android versionCode 13, iOS 1.3.12
- CI: добавлен workflow с typecheck, lint, test:canon (Node 22) и audit. release.yml использует --legacy-peer-deps.

## 1.3.11 — 2026-10-17

- На iPhone кнопка больше не открывает пустую страницу. Файл уходит в «Поделиться» → «Сохранить в Файлы».
- Первая кнопка — журнал HTML. APK только для Android.
- Ссылка на релизы GitHub видна сразу, даже если окно предпросмотра блокирует сохранение.
- Android versionCode 12, iOS 1.3.11

## 1.3.10 — 2026-10-16

- На iPhone первая кнопка — журнал HTML. APK подписан как файл только для Android: iPhone его не устанавливает.
- В предпросмотре и на iPhone нажатие открывает файл с GitHub, а не пустую страницу внутри окна.
- Если система не даёт окно, второе нажатие отдаёт файл в «Поделиться» → «Сохранить в Файлы».
- Android versionCode 11, iOS 1.3.10

## 1.3.9 — 2026-10-11

- Скачивание APK отдаёт тип `application/vnd.android.package-archive` и заголовок «сохранить файл». Раньше тип был пустой, и телефон не ставил файл.
- В окне предпросмотра кнопка открывает релиз GitHub, если встроенный просмотр блокирует загрузку.
- Под кнопками всегда есть ссылка на релизы.
- Android versionCode 10, iOS 1.3.9

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
