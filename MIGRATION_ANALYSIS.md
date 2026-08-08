# React Web → Expo React Native 遷移分析

## 可直接保留的邏輯

- `activeTab`、`weeklyTab`、側欄／AQI 抽屜／警報 Modal／收藏狀態。
- `appData`、逐時預報、一週預報、生活建議與 SRDI 等資料結構及初始資料。
- `fetchApiData` 的平行資料獲取、合併 State 與錯誤處理流程。
- 收藏切換、頁籤切換、白天／夜晚切換、各覆層開關等互動語意。
- API Service 的 11 個預留方法；已移至 `services/weather-api.ts` 並補上 TypeScript 介面。

## 必須重寫的 DOM 與瀏覽器功能

- `div/section/header/nav` → `View`，`span/h1/h2/h3/p` → `Text`。
- `button` → `Pressable`，`input` → `TextInput`，`img` → `expo-image` 的 `Image`。
- 垂直與水平 overflow → `ScrollView`。
- Tailwind class、CSS Grid、偽元素、CSS transition/keyframes → React Native style、Flexbox 與 `Animated`。
- `alert()` → React Native `Alert.alert()`。
- `document`、viewport meta、touch/gesture DOM listener 與 `<style>` 全部移除；原生環境不需要禁止瀏覽器縮放。

## 必須替換／新增的套件

- `lucide-react` → `lucide-react-native` + `react-native-svg`。
- 圖片改用 `expo-image`。
- 安全區使用 `react-native-safe-area-context`。
- CSS gradient 改用 `expo-linear-gradient`。
- Expo SDK 57 / React Native 0.86；僅使用 Expo Go 可支援套件，不引入自訂原生模組。

## 潛在視覺差異

- iOS 與 Android 的中文字型字面寬度、字重插值與基線可能略有差異。
- React Native Flexbox 的文字換行與 Web layout engine 不完全一致；窄螢幕下 SRDI badge 可能更早換行。
- Android 與 iOS 的 `boxShadow`、透明漸層和遠端 PNG 解碼可能有極小差異。
- `TextInput` 無法像 Web CSS 一樣讓 placeholder 與輸入文字使用不同字級。
- 原生 ScrollView 的回彈／慣性由平台控制；資訊與互動方式不變，但手感不會逐幀等同瀏覽器。

## 遷移檔案規劃

- `App.tsx`：僅放 Provider、StatusBar 與畫面入口。
- `screens/weather-home-screen.tsx`：首頁 State、資料合併與整體排列。
- `components/weather-sections.tsx`：天氣、生活建議、逐時、一週、日月卡片。
- `components/top-header.tsx`、`bottom-navigation.tsx`：固定導覽。
- `components/overlays/*`：AQI 抽屜、收藏側欄、警報 Modal，各自保留遮罩與動畫。
- `components/common.tsx`、`weather-icon.tsx`：共用卡片與 icon 對應。
- `services/weather-api.ts`：API 預留接口。
- `data/weather-data.ts`：靜態初始資料與呈現設定。
- `types/weather.ts`：共用 TypeScript 型別。

## 第一階段完成範圍

- 建立全新的 `weather-expo` 目錄，不修改原始 Web JSX。
- 完成 Expo Go 相容骨架與上述分層。
- 遷移天氣首頁五個主要卡片、頂／底導覽與其他頁籤佔位。
- 遷移 AQI 抽屜、收藏側欄、警報 Modal 的開關、遮罩及動畫。
- 每個主要區塊完成後執行 TypeScript 檢查。
