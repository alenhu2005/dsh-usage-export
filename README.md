# DSH Usage & Export

> DeepSeek Harness 的用量成本、PDF／Markdown 匯出與完整統計列外掛。

**DSH Usage & Export** 是一個本機優先的 [DeepSeek Harness](https://www.deepseek.com/) Web 外掛。它把每輪用量、整段對話累計成本與回答匯出放在對話輸入框下方，並讓原本可能被截斷的統計列完整換行顯示。

## 功能

- **本輪與全對話成本**：分開顯示未快取輸入、快取讀取與輸出 token 的成本估算。
- **尖峰時段標記**：顯示目前是尖峰或離峰，以及台灣時間的尖峰時段。
- **安全匯出**：可選擇全部、只匯出用戶或只匯出助理訊息，輸出為 Markdown 或列印成 PDF。
- **可調 PDF 字級**：滑桿範圍 5–20px，預設 11px；標題、內文、表格同比例縮放。
- **展開統計列**：顯示輪數、步數、LLM 時間、首 token、tok/s、快取命中與輸入／輸出 token；內容會換行而不是被省略。

## 安裝

需要 Node.js 22+、DeepSeek Harness `0.1.1-rc.2` 或更新版本，以及可運作的 `web` profile。

```bash
dsh plugin --profile web add github:alenhu2005/dsh-usage-export
```

重新啟動 DSH Web 服務後，開啟任一對話即可使用。移除外掛：

```bash
dsh plugin --profile web remove dsh-usage-export
```

## 使用方式

完成一輪 DeepSeek 回覆後，輸入框下方會出現：

1. `尖峰中` 或 `離峰中`。尖峰為**台灣時間平日 09:00–12:00、14:00–18:00**。
2. `本次指令` 與 `全對話累計` 的預估台幣成本。
3. `匯出 MD` 與 `匯出 PDF` 按鈕。

選擇 PDF 匯出時，可選擇要匯出的訊息，並以滑桿調整列印字級。系統會開啟瀏覽器原生列印視窗；選擇「儲存為 PDF」即可建立檔案。

## 匯出與隱私

- 僅匯出畫面上的**可見文字**。
- 不匯出推理內容、工具呼叫、附件或工作檔。
- 不傳送遙測，也不讀取你的工作區檔案。
- 任一估算只在瀏覽器端以已顯示的 token 用量計算。

## 計價說明

目前內建 DeepSeek V4 Flash、V4 Pro 與 V4 Flash Vision 的官方人民幣牌價，並以 `1 CNY = NT$4.60` 顯示近似台幣金額。價格與時段可能變更，請以 [DeepSeek Models & Pricing](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) 為準。

## 開發

```bash
pnpm install
pnpm run check
pnpm pack
```

測試涵蓋最新回合 token 投影、成本計算、時段判斷、Markdown 安全轉譯及 PDF 字級邊界。

## 授權

[MIT](LICENSE)
