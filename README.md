<!-- deploy pipeline check: 2026-07-02 -->
# Cafe Map 🗺️☕

鹿児島県内のカフェを地図上で探索できるWebアプリケーションです。Instagramの投稿データを元に、リアルタイムで最新のカフェ情報を表示します。

## ✨ 機能

- 📍 **インタラクティブな地図表示**: MapLibre GLを使用した高性能な地図
- 🔍 **カフェ検索**: 店名や住所での絞り込み検索
- 📷 **マーカー表示**: 各カフェの写真をマーカーとして表示
- 💬 **ポップアップ**: マーカークリックで店舗名を表示
- 📱 **レスポンシブデザイン**: スマートフォン・タブレット・PC対応
- 🗂️ **カフェ一覧**: 全カフェのリスト表示と選択機能
- 🎯 **ズーム制御**: パフォーマンス最適化のためのズームレベル制限
- 💾 **位置記憶**: ページリロード時の地図位置保持
- 🔗 **店舗ディープリンク**: `/store/:id` で店舗詳細を直接開ける共有URL。詳細パネルの共有ボタンから取得（Web Share API / リンクコピー）
- 🖼️ **店舗ごとのOGP**: `functions/store/[id].ts` がSNSクローラー向けに店名・店舗写真のメタタグとJSON-LDをサーバー側で注入
- 🔎 **サイトマップ**: `functions/sitemap.xml.ts` がKVの店舗データから `/sitemap.xml` を動的生成（`public/robots.txt` から参照）

## 🛠️ 技術スタック

### フロントエンド
- **React** - UIライブラリ
- **TypeScript** - 型安全なJavaScript
- **MapLibre GL** - オープンソース地図ライブラリ
- **Vite** - 高速ビルドツール

### バックエンド・インフラ
- **Cloudflare Pages** - 静的サイトホスティング
- **Cloudflare Pages Functions** - サーバーレス関数
- **Cloudflare KV** - NoSQLデータストレージ
- **OpenStreetMap Japan** - 地図タイルソース

### 開発ツール
- **ESLint** - コード品質チェック
- **CSS3** - スタイリング
- **Docker** - コンテナ化

## 🚀 クイックスタート

### 前提条件
以下のソフトウェアがインストールされている必要があります：
- **Node.js** (v18以上推奨)
- **npm** (Node.jsに同梱)

### 1. リポジトリのクローン
```bash
git clone https://github.com/yourusername/cafe_map.git
cd cafe_map
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてアプリケーションを確認できます。

### 4. Dockerでの実行 (推奨)

Dockerを使用して、環境構築の手間なくアプリケーションを実行できます。

```bash
docker-compose up --build
```

起動後、ブラウザで `http://localhost:8080` にアクセスしてください。

## 📁 プロジェクト構成

```
cafe_map/
├── public/                          # 静的ファイル
│   ├── icon.jpg                     # アプリアイコン
│   └── vite.svg                     # Viteロゴ
├── src/                             # ソースコード
│   ├── components/                  # Reactコンポーネント
│   │   ├── Information/             # カフェ詳細情報表示
│   │   │   ├── Information.tsx
│   │   │   └── Information.css
│   │   ├── MapView/                 # 地図表示メインコンポーネント
│   │   │   ├── MapView.tsx
│   │   │   ├── MapView.css
│   │   │   ├── CafeMarker.ts        # マーカー生成
│   │   │   └── CafeMarker.css
│   │   ├── Search/                  # 検索機能
│   │   │   ├── Search.tsx
│   │   │   └── Search.css
│   │   ├── MixerPanel/              # 設定パネル
│   │   │   ├── MixerPanel.tsx
│   │   │   └── MixerPanel.css
│   │   └── CafeList/                # カフェ一覧表示
│   │       ├── CafeList.tsx
│   │       └── CafeList.css
│   ├── data/                        # 開発用データ
│   │   └── instagram_posts_with_coords.json
│   ├── lib/                         # ユーティリティ
│   │   └── dataClient.ts            # データ取得ロジック
│   ├── App.tsx                      # アプリケーションルート
│   ├── App.css                      # グローバルスタイル
│   ├── main.tsx                     # エントリーポイント
│   └── index.css                    # ベーススタイル
├── functions/                       # Cloudflare Pages Functions
│   └── api/
│       └── fetch_cafedata.ts        # KVからデータ取得API
├── package.json                     # プロジェクト設定
├── tsconfig.json                    # TypeScript設定
├── vite.config.ts                   # Vite設定
└── README.md                        # このファイル
```

## 🔧 開発ガイド

### 利用可能なコマンド

```bash
# 開発サーバー起動（ホットリロード付き）
npm run dev

# プロダクションビルド
npm run build

# ビルドファイルをローカルでプレビュー
npm run preview

# コードの品質チェック
npm run lint
```

### 環境の違い

#### 開発環境 (`npm run dev`)
- ローカルのJSONファイルからデータを取得
- 高速な開発とデバッグが可能
- ホットリロード機能

#### プロダクション環境 (`npm run build`)
- Cloudflare KVからAPIを通じてデータを取得
- 最新のデータを動的に表示
- 最適化されたビルド

### データ構造

カフェデータは以下の形式で管理されています：

```typescript
type CafeData = {
  id: string                          // 一意識別子
  store_name: string                  // 店舗名
  address: string                     // 住所
  lat: number                         // 緯度
  lng: number                         // 経度
  caption?: string                    // 投稿キャプション
  media_url?: string                  // 画像URL
  thumbnail_url?: string              // サムネイルURL（動画用）
  permalink?: string                  // Instagram投稿URL
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"
  like_count?: number                 // いいね数
  comments_count?: number             // コメント数
  timestamp?: string                  // 投稿日時
}
```

## 🌐 デプロイ

### Cloudflare Pagesへのデプロイ

1. **Cloudflare Pagesプロジェクトの作成**
   - Cloudflare Dashboardにログイン
   - Pages > Create a project を選択
   - GitHubリポジトリを連携

2. **ビルド設定**
   ```
   Build command: npm run build
   Build output directory: dist
   Node.js version: 18 (または最新)
   ```

3. **KVネームスペースの設定**
   - Workers & Pages > KV
   - 新しいネームスペースを作成（例：`cafe-map`）
   - カフェデータをキー `cafe_data_kv.json` で保存

4. **環境変数の設定**
   - Pages プロジェクト > Settings > Environment variables
   - KVネームスペースを `cafe-map` としてバインド

### 手動デプロイ

```bash
# 1. ビルド
npm run build

# 2. distフォルダの内容をCloudflare Pagesにアップロード
```

## 🎨 カスタマイズ

### 地図のスタイルを変更する

`src/components/MapView/MapView.tsx` の以下の部分を編集：

```typescript
style: "https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
```

### ズーム閾値の調整

```typescript
const ZOOM_THRESHOLD = 14 // この値以下だとマーカーを表示しない
```

### マーカーサイズの変更

`src/components/MapView/CafeMarker.css`：

```css
.cafe-marker {
    width: 100px;  /* サイズを調整 */
    height: 100px; /* サイズを調整 */
}
```

### 初期地図位置の設定

```typescript
center: [130.5548586, 31.5901844], // [経度, 緯度]
zoom: 17, // 初期ズームレベル
```

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### Q: 地図が表示されない
**A:** 以下を確認してください：
1. インターネット接続
2. ブラウザのJavaScript有効化
3. コンソールエラーの確認（F12キー）

#### Q: マーカーが表示されない
**A:** 以下を確認してください：
1. ズームレベルが14以上か確認
2. データが正しく読み込まれているかコンソールで確認
3. 地図の表示範囲にカフェがあるか確認

#### Q: 開発環境でAPIエラーが出る
**A:** 開発環境では自動的にローカルデータを使用するため、通常は問題ありません。エラーが継続する場合は `src/lib/dataClient.ts` の `isDevelopment` フラグを確認してください。

#### Q: ビルドエラーが発生する
**A:** 以下をお試しください：
```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
npm run build -- --no-cache
```

## 📊 パフォーマンス最適化

### 実装済みの最適化
- **マーカーの動的表示**: ズームレベルによる表示制御
- **表示範囲フィルタリング**: 画面内のマーカーのみ描画
- **データキャッシュ**: メモリ内でのデータ保持
- **遅延読み込み**: 画像の遅延読み込み
- **コード分割**: 必要な部分のみロード

### さらなる最適化のアイデア
- PWA対応（オフライン機能）
- 画像の WebP 形式対応
- ServiceWorkerによるキャッシュ戦略
- Virtual Scrolling for カフェリスト

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

### 貢献方法

1. **Issues**: バグ報告や機能要望
2. **Pull Requests**: コードの改善提案
3. **Documentation**: ドキュメントの改善

### 開発フロー

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成



