# 部署指南 — 古代入宿度轉換網頁

這個應用是**純前端**的（所有計算都在瀏覽器執行，沒有後端）。因此：

- 不需要伺服器，也不需要 ngrok。
- 建置出來的是靜態檔案，上傳到 Vercel（或 Netlify / GitHub Pages）就能取得永久網址。

## 檔案結構

```
hanru-web/
├─ index.html        # 頁面與表單
├─ src/
│  ├─ hanru.js       # 轉換邏輯（沿用你原本的版本，已移除測試用的 console.log）
│  ├─ main.js        # 表單與函數之間的接線
│  └─ style.css      # 樣式
├─ package.json
└─ .gitignore
```

## 本機開發與測試

```bash
npm install      # 第一次先安裝相依套件
npm run dev      # 開啟 http://localhost:5173 即時預覽
npm run build    # 產生靜態檔案到 dist/
npm run preview  # 預覽建置後的成品（部署前先驗證一次）
```

## 部署到 Vercel

### 方法 A — Vercel CLI（最快，不需要 GitHub）

```bash
npm i -g vercel
npm run build
vercel           # 第一次會要求登入並回答幾個問題
vercel --prod    # 產生可分享的正式網址
```

Vercel 會自動偵測到這是 Vite 專案（Build 指令 `npm run build`、輸出目錄 `dist`）。

### 方法 B — GitHub + Vercel（若之後會持續修改，建議用這個）

1. 執行 `git init && git add . && git commit -m "init"`，再推送到 GitHub repo。
2. 前往 vercel.com → **Add New Project** → 匯入該 repo。
3. Framework 選擇 **Vite**（通常會自動偵測），按下 **Deploy**。
4. 之後每次 `git push` 都會自動重新部署，把 `*.vercel.app` 網址分享給對方即可。

## 已知待辦與注意事項

- `src/hanru.js` 中的二十八宿距星座標是常用標準值，若需更精確可用 SIMBAD / Stellarium 核對。
- 黃道輸入（`eclipticToHanRudu`）忠實重現 CALC-EX.md 的「黃經→赤經」公式（tan α = tan λ × cos ε），但算出的「所屬宿 / 入宿度」可能與古曆表（如範例的「斗18度」）不同：本程式用 J2000 標準星 + 精確歲差，傳統值來自歷史距星實測與宿界慣例。若要對齊傳統曆表，需把 `MANSION_DETERMINATIVES` 換成歷史距星位置。
- `new Astronomy.AstroTime(epochYear)` 的參數語意值得再確認：該函式庫將數字視為「J2000 之後的天數」，未必等同「公元年份」。功能可正常執行，但天文準確度建議覆核。
