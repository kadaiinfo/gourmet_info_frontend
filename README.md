# グルメインフォ

鹿児島の飲食店を地図で探せるWebアプリのフロントエンド


## 立ち上げ手順

上から順に実行すれば起動します。

### リポジトリを取得

```bash
git clone https://github.com/kadaiinfo/gourmet_info_frontend.git
cd gourmet_info_frontend
npm install
```

### `.env.local` を置く

エンジニア部のGoogle Driveにある `.env.local` をダウンロードしてプロジェクト直下に置く。
https://drive.google.com/drive/folders/19i1kZcI1ssh93raR_hFTy5uQ_FTFSg2S

```
gourmet_info_frontend/
├── .env.local   ← ここ
├── package.json
└── src/
```

### 起動

```bash
npm run dev
```

→ http://localhost:5173 が開けば完了。

ローカルで開発する時は、店舗データを`src/data/cafe_data_kv.json`に配置する。
うまく配置できてないと、グルメインフォのアイコンが店舗アイコンとして表示される。

以下のURLから店舗データを取得できる（クラウドフレアKV）
https://dash.cloudflare.com/0e20a53f098ab41bbbed802b3adabb8b/workers/kv/namespaces/51e44551ce024a58aa0cc2f84e419ccd

なお本番環境は、クラウドフレアKVのデータを参照するようになっている。

### 構成

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


---

### デプロイ

`main` に push すると Cloudflare Pages へ自動で公開される


