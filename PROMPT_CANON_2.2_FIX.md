# Промпт: приведение spasibo-mnogo к Canon 2.2 (History → State)

## Контекст

Проект: https://github.com/stephanvoznyak-dot/spasibo-mnogo  
Текущая версия: 1.3.2 / 1.3.3  
Цель: эволюционно устранить архитектурные расхождения с Canon 2.2 **без полного переписывания** приложения.

Сохранить без изменений:
- BIP-39 → PBKDF2-HMAC-SHA512 → первые 32 байта → Ed25519 (как в PROTOCOL.md)
- Канонический CBOR ActBody + SHA-256 + M1/M2
- verifyAct() всегда пересчитывает hash
- Математику клиринга (residual = min, инвариант нетто-позиций N_i)
- Проверку snapshotNets(before) === snapshotNets(after)
- QR и swarm как чистый транспорт (decode → verify → accept)
- Ограничения amount ≤ 10¹², note ≤ 280, nonce ровно 16 байт, from ≠ to

## Главная проблема

Сейчас источник истины смешан:

```
Act (immutable) + LedgerEntry.remainingAmount/status (mutable)
```

Клиринг делает:

```ts
entry.remainingAmount -= take;
```

Это нарушает принципы Canon 2.2:

- History — единственная истина
- State = F(History)
- Derived = F(State)
- Recovery ≡ State Derivation
- Clearing = исторический факт, а не мутация

## Целевая модель

```
HISTORY
  ├── ActWire[]                    // неизменяемые акты
  └── ClearingAssertion[]          // новые исторические факты клиринга
         │
         ▼
   State = deriveState(history)
         │
         ├── remaining(edge)
         ├── status(act)
         ├── net(node)
         └── cycles
```

## Требуемые изменения

### 1. Расширить типы (src/protocol/types.ts)

Добавить:

```ts
/** Исторический факт клиринга. Не мутирует предыдущие акты. */
type ClearingAssertion = {
  version: 1;
  cycle: string[];           // упорядоченный список agentId (publicKey hex)
  residual: number;          // r(C) = min remaining на момент применения
  appliedAt: number;         // unix ms
  nonce: Uint8Array;         // 16 байт
  // опционально: prevHash головы журнала инициатора
};

type HistoryEvent =
  | { kind: 'act'; wire: ActWire }
  | { kind: 'clearing'; assertion: ClearingAssertion };
```

### 2. Ввести PrevHash (минимально необходимое для Canon)

В ActBody добавить необязательное (для обратной совместимости) поле:

```
prevHash: bstr (32) | null   // SHA-256 предыдущего события журнала from-агента
```

Правила:
- При создании M1 инициатор ставит prevHash = текущая голова своего журнала (или null, если журнал пуст).
- verifyAct проверяет, что prevHash соответствует известной голове **только если** локальный журнал уже содержит предыдущие события этого агента. Если журнал пуст или событие пришло извне — принимать с предупреждением (мягкая миграция).
- После принятия акта голова журнала агента обновляется на hash этого акта.

Не ломать существующие акты версии 1 (prevHash = null допустим).

### 3. Убрать мутацию remainingAmount

В storage/db.ts и clearing.ts:

- Перестать писать `entry.remainingAmount -= take`.
- Вместо этого при успешном клиринге создавать и сохранять `ClearingAssertion`.
- `remainingAmount` и `status` больше не являются первичными полями хранения. Они вычисляются.

### 4. Реализовать deriveState

Новый модуль (рекомендуется `src/protocol/derive.ts`):

```ts
function deriveState(history: HistoryEvent[]): State {
  // 1. Собрать все финализированные акты (M1+M2).
  // 2. Применить ClearingAssertion в порядке появления.
  // 3. Для каждого ребра remaining = amount - сумма residual, прошедших через это ребро.
  // 4. status вывести из remaining:
  //      remaining === amount → finalized
  //      0 < remaining < amount → partially_cleared
  //      remaining === 0 → cleared
  // 5. Построить net-позиции и список возможных циклов.
  // 6. Гарантировать: N_i до и после любого ClearingAssertion совпадают.
}
```

Инвариант должен проверяться внутри deriveState так же, как сейчас проверяется в applyCycle.

### 5. API-переход (минимальные точки изменения)

Заменить:

| Старое | Новое |
|--------|-------|
| `putAct(act)` | `appendHistory({ kind: 'act', wire })` |
| `applyCycle(cycle)` | `appendHistory({ kind: 'clearing', assertion })` + пересчёт State |
| чтение `entry.remainingAmount` | `state.remaining.get(edgeKey)` |
| чтение `entry.status` | `state.status.get(hashHex)` |

UI и селекторы должны получать уже вычисленный State, а не сырые записи IndexedDB.

### 6. Миграция существующих данных

При первом запуске после обновления:

1. Прочитать все текущие записи acts из IndexedDB.
2. Построить History = массив { kind: 'act', wire }.
3. Если у записи remainingAmount < amount — синтезировать один или несколько ClearingAssertion, которые в сумме дают разницу (можно одним assertion на акт с residual = amount − remaining).
4. Сохранить новую структуру History.
5. Больше никогда не хранить remainingAmount/status как источник истины.

Миграция должна быть идемпотентной и логироваться.

### 7. Обратная совместимость QR / swarm

- Входящие акты старого формата (без prevHash) принимаются.
- Исходящие акты новой версии могут содержать prevHash.
- ver протокола остаётся 1 до тех пор, пока не потребуется breaking change ActBody. При появлении обязательного prevHash — увеличить ver.

### 8. Тесты (обязательно)

Добавить / расширить:

- deriveState на треугольнике 18-12-8 → remaining 10/4/0, net неизменны.
- Повторный deriveState от той же History даёт идентичный State (детерминизм).
- После ClearingAssertion History содержит новый факт, а исходные ActWire не изменены.
- Миграция со старого remainingAmount корректно восстанавливает State.
- verifyAct по-прежнему отвергает подделанный hash / неверную подпись.
- Инвариант N_i нарушить невозможно (throw).

### 9. Документация

Обновить PROTOCOL.md:

- §5: Journal теперь хранит HistoryEvent[], а не мутабельные LedgerEntry.
- §6: Клиринг создаёт ClearingAssertion; remaining/status — производные.
- Добавить описание PrevHash и правила мягкой миграции.
- Явно зафиксировать: Recovery = deriveState(History).

Обновить SECURITY.md: отметить, что remainingAmount больше не является доверенным полем хранения.

### 10. Порядок работ (рекомендуемый)

1. Добавить типы HistoryEvent / ClearingAssertion / State.
2. Реализовать deriveState + unit-тесты на 18-12-8 и инвариант.
3. Ввести appendHistory вместо прямых мутаций.
4. Перевести clearing.ts на создание assertion.
5. Миграция IndexedDB.
6. Обновить UI-селекторы на чтение из State.
7. PrevHash (можно вторым этапом).
8. Обновить PROTOCOL.md / CHANGELOG / тесты.

## Критерии готовности

- [ ] Ни один код-путь больше не делает `remainingAmount -= …`
- [ ] State полностью восстанавливается из History
- [ ] Инвариант нетто-позиций проверяется в deriveState
- [ ] Старые данные мигрируют без потери
- [ ] QR/swarm продолжают работать
- [ ] Все существующие golden-тесты F01, F03–F08 проходят
- [ ] Новые тесты на deriveState и ClearingAssertion зелёные
- [ ] PROTOCOL.md описывает модель History → State

## Чего делать не нужно

- Не менять криптографию (BIP-39, Ed25519, CBOR, SHA-256).
- Не вводить SLIP-0010 без отдельного решения.
- Не делать клиринг мультиподписанным в этой итерации.
- Не добавлять PIN/биометрию.
- Не переписывать UI с нуля — только точку получения данных.

---

Выполни изменения в указанном порядке. После каждого крупного шага запускай существующие и новые тесты. В конце предоставь краткий отчёт: какие файлы изменены, как выглядит новая схема хранения и как выполняется Recovery.
