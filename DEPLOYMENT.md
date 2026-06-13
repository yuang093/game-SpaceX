# 🚀 Vercel 部署指南

## 方法一：網頁介面（推薦，最快 1 分鐘）

1. 登入 [vercel.com](https://vercel.com)（用 GitHub 帳號）
2. 點右上角 **「Add New...」→「Project」**
3. 在 Import Git Repository 搜尋 `yuang093/game-SpaceX`
4. 點 **「Import」**
5. 設定：
   - Framework Preset：**Other**
   - Build Command：（留空）
   - Output Directory：（留空）
   - Install Command：（留空）
6. 點 **「Deploy」** 🚀
7. 等待 30 秒，取得網址如 `https://game-spacex.vercel.app`

## 方法二：Vercel CLI

```bash
# 安裝
npm i -g vercel

# 登入
vercel login

# 連結專案
cd D:\game
vercel link

# 部署
vercel --prod
```

## 方法三：GitHub Actions 自動部署

建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm i -g vercel
      - run: vercel deploy --prod --yes --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

需要在 GitHub repo 設定 Secrets：
- `VERCEL_TOKEN` - 在 Vercel 設定取得
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 部署後設定

### 1. 自訂網域（可選）
Vercel Dashboard → Project → Settings → Domains

### 2. 環境變數（可選）
- `ENABLE_KV` = `true`（啟用雲端存檔）

### 3. 效能監控
Vercel Dashboard → Project → Analytics

## 故障排除

### 快取問題
```bash
# 清除 Vercel 快取
vercel deploy --force
```

### Service Worker 沒更新
使用者需在 DevTools → Application → Service Workers → Unregister
或等待 24 小時自動過期

### 路徑問題
本專案使用根目錄部署，所有資源使用相對路徑（`./assets/...`）
