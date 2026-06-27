# 聖地巡禮社群平台

動畫聖地巡禮社群 — 像 AniList 一樣追蹤巡禮進度，結合聖地列表、打卡、遊記與聖地現況協作維護。

## 功能

- **作品聖地頁**：AniList 同步 + 本地巡禮 meta 覆寫
- **聖地百科**：列表探索、詳情、交通/拍攝/禮儀資訊
- **打卡與相片**：含對比照上傳
- **遊記**：Tiptap 區塊編輯器
- **路線規劃**：拖曳排序、多日行程、時間估算、Google Maps / iCal 匯出
- **探索地圖**：站內 Leaflet + OpenStreetMap（Carto 深色瓦片），支援篩選與 clustering
- **社群**：追蹤、動態牆、讚、留言、收藏、清單
- **現況回報**：協作維護聖地是否仍開放
- **成就與年度 Wrapped**：巡禮統計、都道府縣著色
- **搜尋**：Meilisearch 全文索引
- **審核後台**：版主審核 UGC

## 技術棧

- Next.js 15 + TypeScript + Tailwind
- PostgreSQL + PostGIS + Drizzle ORM
- Auth.js (Google / Discord / 開發用 Credentials)
- Meilisearch + BullMQ + Redis
- Tiptap 編輯器

站內提供 **Leaflet 探索地圖**（`/spots/map`，OpenStreetMap 瓦片）；聖地詳情頁的「導航」仍使用 **Google 地圖外部連結**，無 Mapbox 等用量額度問題。

## 快速開始

### 1. 啟動基礎服務

```bash
docker compose up -d
```

### 2. 環境變數

主要設定在 **`apps/web/.env.local`**（已預填本機開發用的資料庫與 `AUTH_SECRET`）。

| 變數 | 必填？ | 說明 |
|------|--------|------|
| `DATABASE_URL` | 是 | 已對應 docker-compose，通常不用改 |
| `AUTH_SECRET` | 是 | 已自動產生 |
| `AUTH_URL` | 是 | 本機為 `http://localhost:3000` |
| `GOOGLE_CLIENT_*` | 選用 | Google OAuth，不填仍可用「開發用登入」 |
| `DISCORD_CLIENT_*` | 選用 | Discord OAuth |
| `S3_*` | 選用 | 生產環境圖床；本機用 `uploads/` |

詳細申請步驟見 `apps/web/.env.local` 內註解。

### 3. 安裝依賴

```bash
npm install
```

### 4. 資料庫遷移與種子資料

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000

### 效能驗證

本機 `npm run dev`（Turbopack）的編譯與熱更新會比正式環境慢。若要衡量真實導航與 TTFB，請使用 production 模式：

```bash
npm run build && npm start
```

然後在瀏覽器 Network 面板或 Lighthouse 中比較各頁載入時間。

### 6. （選用）啟動背景 Worker

```bash
npm run worker
```

Worker 負責 AniList 同步與 Meilisearch 全文索引。本機開發時需同時啟動 `docker compose`（PostgreSQL + Redis）與 `npm run worker`；生產環境建議將 Worker 部署為獨立長駐程序（如 Railway、Fly.io、Render 或自架 VM），並設定 `DATABASE_URL`、`REDIS_URL`、`MEILISEARCH_URL`、`MEILISEARCH_API_KEY` 等環境變數。

### 測試與型別檢查

```bash
npm run test          # Vitest 單元測試（apps/web）
npm run test:watch    # 監聽模式（在 apps/web 目錄或 -w @seichi/web）
npm run typecheck     # 建置 shared 套件並對 web 做 tsc --noEmit
npm run test:e2e      # Playwright E2E smoke（需先 build && start 或設 PLAYWRIGHT_BASE_URL）
```

### 批次匯入聖地

```bash
npm run db:import-spots -- ./path/to/spots.json
```

支援 JSON 陣列或 CSV（欄位：`nameZh`, `latitude`, `longitude`, `prefecture`, `anilistIds` 等）。詳見 `packages/db/scripts/import-spots.ts`。

### Web Push 通知

1. 產生 VAPID 金鑰（例如 `npx web-push generate-vapid-keys`）
2. 設定環境變數：
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`（伺服器）
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（與 public key 相同，供瀏覽器訂閱）
3. 執行 migration `packages/db/drizzle/0003_push_subscriptions.sql`
4. 使用者於 **設定頁** 開啟推播訂閱

### E2E 測試

```bash
npm run build -w @seichi/web
npm run start -w @seichi/web   # 另一終端
npm run test:e2e               # 或 PLAYWRIGHT_BASE_URL=http://localhost:3000
```

Smoke 測試涵蓋首頁、搜尋、聖地列表導覽、手機「更多」導覽 sheet。CI 於 `main` 分支執行 E2E（PR 上為 `continue-on-error`）。

### Wave 23 驗收重點

- **i18n**：日文模式下作品頁/搜尋/首頁/Wrapped/地圖 popup 標題優先日文
- **排行榜**：本機無 Redis 時 `npm run build` 不應因 `/leaderboard` 卡住；貢獻分更新後排行榜快取會失效
- **設定**：頭像在本機（無 S3）可透過 `/api/photos` fallback 上傳；Push 開關會還原既有訂閱狀態
- **手機**：「更多」sheet 顯示通知未讀徽章；leaderboard/bookmarks/routes/travelogue/lists 有 loading 殼層
- **動態**：篩選含追蹤、清單類型

### Wave 24 驗收重點

- **可靠性**：全站 `error.tsx`；搜尋失敗/地圖空結果有可見提示；遊記儲存失敗有 toast 回饋
- **搜尋**：手機篩選含完整都道府縣；改篩選自動重查；有 query 時同步 `?q=` URL
- **Loading**：路線/清單詳情、設定、通知、打卡詳情有 loading 殼層
- **i18n**：動態牆動詞與日期依 locale 顯示；作品連結編輯器與清單 API 標題接 locale
- **快取**：打卡後 visits/prefectures/contribution 排行榜快取皆失效
- **Push**：瀏覽器已有訂閱時 mount 會靜默重同步至 DB

### Wave 25 驗收要點

- **延遲**：地圖拖曳有 300ms 防抖；map API 僅查 viewport 內 visits；匿名 markers 有 30s 快取
- **打卡**：POST 用 COUNT 取代全量 visits；作品進度批次查詢
- **快取**：首頁 snapshot、動態第一頁有 60s cacheFetch
- **Bundle**：遊記編輯器 dynamic import；遊記詳情留言 lazy load
- **流程**：`/lists/new` 可建立清單；路線儲存/留言/通知失敗有提示

## 開發用登入

在開發環境可使用 Credentials 登入：
- 前往 `/auth/signin`
- 使用任意 Email（如 `demo@seichi.local`）

種子資料會建立 `demo@seichi.local` 管理員帳號。

## 專案結構

```
apps/web/          Next.js 主站
packages/db/       Drizzle schema + migrations + seed
packages/shared/   共用常數與類型
workers/           AniList 同步 + Meilisearch 索引
```

## 主要路由

| 路徑 | 說明 |
|------|------|
| `/` | 探索首頁 |
| `/search` | 全域搜尋 |
| `/feed` | 動態牆 |
| `/leaderboard` | 貢獻排行榜 |
| `/notifications` | 通知中心 |
| `/bookmarks` | 我的收藏 |
| `/anime/[id]` | 作品聖地頁 |
| `/anime/[id]/discuss` | 作品討論 |
| `/spots` | 聖地列表 |
| `/spots/new` | 新增聖地 |
| `/spots/[id]` | 聖地詳情 |
| `/spots/[id]/edit` | 編輯聖地 |
| `/spots/map` | 探索地圖（Leaflet + OSM） |
| `/regions/[prefecture]` | 都道府縣聖地 |
| `/users/[id]` | 用戶巡禮檔案 |
| `/users/[id]/wrapped/[year]` | 年度 Wrapped |
| `/visits/[id]` | 打卡詳情 |
| `/travelogue` | 遊記列表 |
| `/travelogue/new` | 撰寫遊記 |
| `/travelogue/[slug]` | 遊記詳情 |
| `/travelogue/[slug]/edit` | 編輯遊記 |
| `/routes` | 路線列表 |
| `/routes/new` | 路線規劃 |
| `/routes/[id]` | 路線詳情 |
| `/routes/[id]/join` | 加入協作路線 |
| `/routes/[id]/print` | 列印路線 |
| `/lists` | 清單列表 |
| `/lists/[id]` | 清單詳情 |
| `/admin` | 審核後台 |
| `/settings` | 帳號設定 |
| `/auth/signin` | 登入 |
| `/terms` | 服務條款 |
| `/privacy` | 隱私權政策 |
| `/copyright` | 著作權聲明 |

## 多語系（i18n）

站內使用 **next-intl**，支援 **繁體中文（zh-TW）** 與 **日本語（ja）**。預設語系為 zh-TW；語系不會出現在 URL 前綴（`localePrefix: never`），改以 `NEXT_LOCALE` Cookie 儲存偏好。頁首的語言切換器可即時切換；翻譯字串位於 `apps/web/messages/zh-TW.json` 與 `apps/web/messages/ja.json`。聖地與作品名稱會依語系顯示對應欄位（見 `display-names.ts`）。

## 部署（Vercel + 外部服務）

建議將 **Root Directory** 設為 `apps/web`（已附 `vercel.json` 處理 monorepo 安裝與建置）。

| 服務 | 用途 | 環境變數 |
|------|------|----------|
| **Neon / Supabase** | PostgreSQL + PostGIS | `DATABASE_URL` |
| **Upstash** | Redis（Worker 佇列） | `REDIS_URL` |
| **Worker 程序** | AniList 同步 + 搜尋索引（獨立部署，非 Vercel） | `DATABASE_URL`, `REDIS_URL`, `MEILISEARCH_*` |
| **Meilisearch Cloud** | 全文搜尋 | `MEILISEARCH_URL`, `MEILISEARCH_API_KEY` |
| **Cloudflare R2** | 圖片儲存（S3 相容） | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` |
| **Sentry** | 錯誤監控（選用） | `SENTRY_DSN` |

生產環境請設定 `AUTH_URL` 為正式網域。未設定 `S3_*` 時圖片存本機 `uploads/`（僅適合開發）。
未設定 `SENTRY_DSN` 時不會載入 Sentry。搜尋索引於內容建立／審核通過時自動更新。
