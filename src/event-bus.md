`EventMap` 是這個 event bus 的核心型別設計，讓我用淺顯的方式解釋：

## 型別設計流程

### 1. **EventMap 的基本概念**
```typescript
EventMap extends Record<string, unknown>
```
這是一個「事件名稱 → 資料型別」的對應表：
- `string`：事件名稱（像 "user:login", "todo:add"）
- `unknown`：該事件攜帶的資料型別

**例子：**
```typescript
type MyEvents = {
  "user:login": { userId: string };
  "todo:add": { title: string };
  "notification:show": { message: string; type: "success" | "error" };
};
```

### 2. **如何確保型別安全**

#### Step 1: 在 `on()` 註冊監聽器時
```typescript
on<E extends keyof EventMap>(
  event: E,                          // 事件名稱必須是 EventMap 的 key
  listener: BusListener<EventMap[E]> // listener 接收的資料型別 = EventMap[E]
): string
```

**實際使用：**
```typescript
const bus = createEventBus<MyEvents>();

bus.on("user:login", (data) => {
  // TypeScript 知道 data 是 { userId: string }
  console.log(data.userId); // ✅ 型別安全
  console.log(data.name);   // ❌ 錯誤：name 不存在
});
```

#### Step 2: 在 `emit()` 發送事件時
```typescript
emit<E extends keyof EventMap>(
  event: E,           // 事件名稱
  payload: EventMap[E] // payload 必須符合該事件的型別
): Promise<void>
```

**實際使用：**
```typescript
bus.emit("user:login", { userId: "123" }); // ✅ 正確
bus.emit("user:login", { name: "John" });  // ❌ 錯誤：型別不符
```

### 3. **架構設計的優點**

#### ✅ **型別推導（Type Inference）**
```typescript
// TypeScript 自動推導出 data 的型別
bus.on("todo:add", (data) => {
  // data 自動是 { title: string }
});
```

#### ✅ **防止拼字錯誤**
```typescript
bus.emit("user:loginn", { userId: "123" }); 
// ❌ TypeScript 錯誤：'user:loginn' 不在 EventMap 中
```

#### ✅ **事件與資料的對應關係一目了然**
```typescript
type MyEvents = {
  "user:login": { userId: string };    // 看一眼就知道這個事件需要什麼資料
  "user:logout": void;                 // 這個事件不需要資料
};
```

## 實際運作流程圖

```
定義 EventMap
    ↓
{ "user:login": { userId: string } }
    ↓
註冊監聽器 (on)
    ↓
TypeScript 檢查：listener 是否接受 { userId: string }
    ↓
發送事件 (emit)
    ↓
TypeScript 檢查：payload 是否為 { userId: string }
    ↓
所有監聽器都收到正確型別的資料 ✅
```

## 為什麼這樣設計好測試、好閱讀、好維護？

1. **好測試**：mock 事件時，TypeScript 會強制你提供正確的資料結構
2. **好閱讀**：看 `EventMap` 型別定義就知道整個應用程式有哪些事件
3. **好維護**：修改事件資料結構時，所有使用該事件的地方都會報錯，不會漏改

這就是 Functional Programming 中「讓型別系統幫你工作」的精神！ 🎯