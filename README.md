# Cafe Map（グルメインフォ）

鹿児島の飲食店を地図で探せるWebアプリ

---

# 立ち上げ手順

上から順に実行すれば起動します。

## 1. Node.js を用意

v20 以上。`node -v` で確認。

## 2. リポジトリを取得

```bash
git clone https://github.com/kadaiinfo/gourmet_info_frontend.git
cd gourmet_info_frontend
npm install
```

## 3. `.env.local` を置く

エンジニア部のGoogle Driveにある `.env.local` をダウンロードしてプロジェクト直下に置く。

```
gourmet_info_frontend/
├── .env.local   ← ここ
├── package.json
└── src/
```

## 4. 起動

```bash
npm run dev
```

→ http://localhost:5173 が開けば完了。

店舗データは `src/data/cafe_data_kv.json`（ローカルのコピー）を読む。


# 構成

```
src/
├── components/
│   ├── MapView/        # 地図本体（hooks/ と utils/ に分割、README あり）
│   ├── Information/    # 店舗詳細パネル
│   ├── Search/         # 検索バー
│   ├── MixerPanel/     # フィルター・設定
│   ├── CafeList/       # 店舗一覧
│   ├── NearbyCafeList/ # 現在地周辺
│   └── SwipeDeck/      # スワイプUI
├── hooks/              # useFavorites など
├── lib/dataClient.ts   # 店舗データ取得（dev=ローカルJSON / prod=API）
└── data/               # 開発用の店舗JSON、おすすめ記事

functions/              # Cloudflare Pages Functions
├── api/fetch_cafedata  # KVから店舗データを返す
├── api/favorites/      # お気に入りCRUD（D1 + Clerk認証）
├── api/og_image/[id]   # 店舗ごとのOG画像
├── store/[id]          # SNS向けOGP・JSON-LD注入
└── sitemap.xml         # KVからサイトマップ生成
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + ビルド → `dist/` |
| `npm run preview` | ビルド結果を確認 |
| `npm run lint` | ESLint |
| `npm run fetch-ogp` | おすすめ記事のOGP取得（→ `src/data/README.md`） |

---

# デプロイ

`main` に push すると Cloudflare Pages が自動でビルド・公開する。Build command は `npm run build`、出力は `dist`。


