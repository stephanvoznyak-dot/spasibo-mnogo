import type { Lang } from "./i18n";

export interface GuideSection {
  kicker: string;
  title: string;
  body: string[];
}

const userRu: GuideSection[] = [
  {
    kicker: "01",
    title: "Что это",
    body: [
      "«Спасибо много» — личный журнал: кто кому и сколько должен. Запись нельзя подделать или изменить в одностороннем порядке.",
      "У каждого свой список. Чужие записи никто не видит без вашего согласия. Интернет не нужен — достаточно встретиться и обменяться QR.",
    ],
  },
  {
    kicker: "02",
    title: "Четыре шага",
    body: [
      "Создаёте себя. Приложение даёт секретную фразу из 12 или 24 слов — это ваш ключ. Запишите на бумаге.",
      "Фиксируете обязательство: кому, сколько, за что. Подписываете. Получатель тоже подписывает.",
      "Показываете QR. Другой человек сканирует — запись появляется у обоих.",
      "Смотрите остатки. Если долги образуют круг, приложение предлагает взаимный зачёт.",
    ],
  },
  {
    kicker: "03",
    title: "Где это нужно",
    body: [
      "Друзья и семья: кто-то занял деньги, кто-то оплатил ужин или помог с ремонтом.",
      "Соседи, клубы, небольшие команды: внутренние обязательства без общей бухгалтерии и без облака.",
    ],
  },
  {
    kicker: "04",
    title: "Как создать обязательство",
    body: [
      "Укажите человека (его публичный идентификатор), сумму — целое число — и короткую пометку, например «за ужин».",
      "Нажмите «Подписать». Покажите QR. Другой человек видит предложение, проверяет и подписывает со своей стороны.",
      "После двух подписей запись нельзя изменить или удалить в одностороннем порядке.",
    ],
  },
  {
    kicker: "05",
    title: "Секретная фраза",
    body: [
      "Кто знает фразу — тот и есть вы. Нет кнопки «забыл пароль».",
      "Храните на бумаге, не в телефоне и не в облаке. Не фотографируйте.",
      "Смените телефон — введите ту же фразу и восстановите резервную копию журнала.",
    ],
  },
  {
    kicker: "06",
    title: "Доверие",
    body: [
      "Приложение не выдаёт доверие. Оно фиксирует действия.",
      "Ваше поведение — доверие к вам. Поведение другого — основание доверять ему.",
      "Мы всё честно запишем и покажем. История не стирается.",
    ],
  },
  {
    kicker: "07",
    title: "Безопасность",
    body: [
      "Защищено приложением: две подписи, ключ не уходит с устройства, нет центрального сервера, каждая запись проверяется математически.",
      "Зависит от вас: сохраните фразу, не передавайте её, проверяйте, кому подписываете, блокируйте телефон.",
    ],
  },
  {
    kicker: "08",
    title: "Чем это не является",
    body: [
      "Не банк и не платёжная система: деньги не переводятся и не хранятся.",
      "Не криптовалюта: нет токенов, курса и биржи.",
      "Не судья: никого не заставляет платить. Выбор, кому доверять, остаётся за вами.",
    ],
  },
  {
    kicker: "09",
    title: "С чего начать",
    body: [
      "Установите APK или откройте HTML. Создайте личность и запишите фразу.",
      "Покажите свой код другу. Сделайте первую запись, обменяйтесь QR. Остатки и зачёт приложение посчитает само.",
    ],
  },
];

const userEn: GuideSection[] = [
  {
    kicker: "01",
    title: "What this is",
    body: [
      "«Spasibo Mnogo» is a personal ledger of who owes whom, and how much. A record cannot be forged or changed unilaterally.",
      "Each person keeps their own list. Nobody sees your entries without consent. No internet — meet and exchange a QR code.",
    ],
  },
  {
    kicker: "02",
    title: "Four steps",
    body: [
      "Create yourself. You get a 12- or 24-word secret phrase — your key. Write it on paper.",
      "Record an obligation: whom, how much, why. You sign. The other person signs too.",
      "Show the QR. They scan — the entry appears on both devices.",
      "Watch remaining balances. If debts form a circle, the app offers clearing.",
    ],
  },
  {
    kicker: "03",
    title: "Where it helps",
    body: [
      "Friends and family: someone lent money, paid for dinner, or helped with repairs.",
      "Neighbours, clubs, small teams: internal obligations without shared accounting and without the cloud.",
    ],
  },
  {
    kicker: "04",
    title: "How to record an obligation",
    body: [
      "Pick the person (their public identifier), an integer amount, and a short note such as “dinner”.",
      "Tap Sign. Show the QR. The other person reviews and signs on their side.",
      "After two signatures the record cannot be changed or deleted unilaterally.",
    ],
  },
  {
    kicker: "05",
    title: "Secret phrase",
    body: [
      "Whoever knows the phrase is you. There is no “forgot password”.",
      "Keep it on paper, not on the phone or in the cloud. Do not photograph it.",
      "New phone — enter the same phrase and restore the ledger backup.",
    ],
  },
  {
    kicker: "06",
    title: "Trust",
    body: [
      "The app does not grant trust. It records actions.",
      "Your behaviour is why others trust you. Theirs is why you trust them.",
      "We write it honestly and show it. History is not erased.",
    ],
  },
  {
    kicker: "07",
    title: "Safety",
    body: [
      "The app protects: two signatures, the key never leaves the device, no central server, every record is checked mathematically.",
      "You protect: keep the phrase, never share it, check whom you sign for, lock the phone.",
    ],
  },
  {
    kicker: "08",
    title: "What it is not",
    body: [
      "Not a bank or payment system: no money is moved or held.",
      "Not cryptocurrency: no tokens, rates, or exchanges.",
      "Not a judge: it does not force anyone to pay. You choose whom to trust.",
    ],
  },
  {
    kicker: "09",
    title: "Getting started",
    body: [
      "Install the APK or open the HTML. Create an identity and write the phrase down.",
      "Show your code to a friend. Make a first record and exchange QR codes. Remainders and clearing are computed for you.",
    ],
  },
];

const techRu: GuideSection[] = [
  {
    kicker: "P0–P2",
    title: "Три слоя",
    body: [
      "Модель: акты, граф, клиринг. Криптография: BIP-39 → Ed25519, SHA-256, канонический CBOR. Транспорт: QR и рой — никогда не источник истины.",
      "Аксиома: транспорт ≠ модель ≠ состояние. Журнал — единственная персистентная правда. Состояние S = F(H) всегда пересчитывается.",
    ],
  },
  {
    kicker: "Акт",
    title: "Две подписи",
    body: [
      "После M1 поля from, to, amount, note, timestamp, nonce заморожены. Хеш при проверке всегда пересчитывается.",
      "M2 ставится один раз контрагентом. Финализированный акт неизменяем. amount — целое ≥ 1.",
    ],
  },
  {
    kicker: "QR",
    title: "Конверт",
    body: [
      "proto: normal-project, ver: 1, type: act-proposal | act-final | sync-request | sync-response, payload: base64url(CBOR).",
      "Любой полученный акт проходит hash + подписи + amount ≥ 1 до записи в журнал.",
    ],
  },
  {
    kicker: "Клиринг",
    title: "Residual",
    body: [
      "Bᵢⱼ = Σ remaining(i→j) − Σ remaining(j→i). Residual цикла r(C) = min remaining на рёбрах.",
      "Клиринг сокращает только цикл. Чистые позиции сохраняются. Без цикла, актов или остатка — отказ (F04).",
    ],
  },
  {
    kicker: "Пример",
    title: "Анна → Борис 18, Борис → Виктор 12, Виктор → Анна 8",
    body: [
      "r(C) = 8. После: 10, 4 и 0. Три долга сократились на одну величину. Ничего не создано и не уничтожено сверх цикла.",
    ],
  },
  {
    kicker: "Рой",
    title: "Только доставка",
    body: [
      "bitfield / have / want / piece. Новый финализированный акт → have. Нет у себя → want. Ответ — piece.",
      "HTML: BroadcastChannel. APK: тот же журнал, камера, без серверного консенсуса.",
    ],
  },
  {
    kicker: "Инварианты",
    title: "T-I … T-VIII",
    body: [
      "Журнал — истина. S = F(H). Детерминизм. Финализированный акт неизменяем.",
      "Приватный ключ локален. Транспорт не входит в P0. Offline-first. Минимум внешних зависимостей.",
    ],
  },
  {
    kicker: "Угрозы",
    title: "Закрытые классы",
    body: [
      "F01 XSS из суммы/пометки. F03 дробные и отрицательные суммы. F04 фиктивный клиринг.",
      "F05 двойной клиринг ребра. F06 подмена hash. F07 правка полей после M1. F08 молчаливые ошибки записи.",
    ],
  },
  {
    kicker: "Стек",
    title: "Промышленный образец",
    body: [
      "Самодостаточный HTML, Capacitor APK (minSdk 26, CAMERA). IndexedDB append-only. Приватный ключ не попадает в журнал, QR, логи и экспорт.",
      "Документы: EOS Canon 2.2, Technology Canon 1.0, PROTOCOL.md, SECURITY.md.",
    ],
  },
];

const techEn: GuideSection[] = [
  {
    kicker: "P0–P2",
    title: "Three layers",
    body: [
      "Model: acts, graph, clearing. Crypto: BIP-39 → Ed25519, SHA-256, canonical CBOR. Transport: QR and swarm — never a source of truth.",
      "Axiom: transport ≠ model ≠ state. The journal is the only persistent truth. State S = F(H) is always recomputed.",
    ],
  },
  {
    kicker: "Act",
    title: "Two signatures",
    body: [
      "After M1, from, to, amount, note, timestamp, nonce are frozen. Hash is always recomputed on verify.",
      "M2 is set once by the counterparty. A finalized act is immutable. amount is an integer ≥ 1.",
    ],
  },
  {
    kicker: "QR",
    title: "Envelope",
    body: [
      "proto: normal-project, ver: 1, type: act-proposal | act-final | sync-request | sync-response, payload: base64url(CBOR).",
      "Every received act is fully validated (hash + signatures + amount ≥ 1) before it is written.",
    ],
  },
  {
    kicker: "Clearing",
    title: "Residual",
    body: [
      "Bᵢⱼ = Σ remaining(i→j) − Σ remaining(j→i). Cycle residual r(C) = min remaining on the edges.",
      "Clearing only shrinks a cycle. Net positions are preserved. No cycle, acts, or remainder → refuse (F04).",
    ],
  },
  {
    kicker: "Example",
    title: "Anna → Boris 18, Boris → Victor 12, Victor → Anna 8",
    body: [
      "r(C) = 8. After: 10, 4 and 0. All three debts shrink by the same amount. Nothing is created or destroyed beyond the cycle.",
    ],
  },
  {
    kicker: "Swarm",
    title: "Delivery only",
    body: [
      "bitfield / have / want / piece. New finalized act → have. Missing → want. Reply is a piece.",
      "HTML: BroadcastChannel. APK: the same journal and camera, no server consensus.",
    ],
  },
  {
    kicker: "Invariants",
    title: "T-I … T-VIII",
    body: [
      "The journal is truth. S = F(H). Determinism. A finalized act is immutable.",
      "The private key is local. Transport is outside P0. Offline-first. Minimal external dependencies.",
    ],
  },
  {
    kicker: "Threats",
    title: "Closed classes",
    body: [
      "F01 XSS from amount/note. F03 fractional and negative amounts. F04 fictitious clearing.",
      "F05 double-clearing an edge. F06 hash substitution. F07 field edits after M1. F08 silent storage errors.",
    ],
  },
  {
    kicker: "Stack",
    title: "Industrial prototype",
    body: [
      "Self-contained HTML, Capacitor APK (minSdk 26, CAMERA). Append-only IndexedDB. The private key never enters the journal, QR, logs, or export.",
      "Documents: EOS Canon 2.2, Technology Canon 1.0, PROTOCOL.md, SECURITY.md.",
    ],
  },
];

export function userGuide(lang: Lang): GuideSection[] {
  return lang === "ru" ? userRu : userEn;
}

export function techGuide(lang: Lang): GuideSection[] {
  return lang === "ru" ? techRu : techEn;
}
