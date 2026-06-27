# 50by50 LP — プロトタイプ納品メモ

## フォルダ構成（素材管理表準拠）

```
50by50-site/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── video/          ← bg-loop.mp4 をここに置くだけで背景動画が動きます
    ├── images/         ← 現在は全てプレースホルダー（同名で上書き）
    └── icons/
        ├── favicon.png             （シンボル白抜き＋紫スクエア・抽出済み）
        └── logo-50by50-full-dark.png（フルロゴ紫黒版・透過・トリミング済み）
```

## 素材状況（2回目更新: 実素材組み込み済み）

組み込み済み: bg-loop.mp4（30秒MOVから先頭8秒を720×1280/H.264/無音に変換・1.7MB）、
bg-poster（背中合わせ縦Ver）、character-shade（通常+戦闘/タップ切替）、
character-echo（通常+女装潜入/タップ切替）、relationship（敵同士チャート）、
music-50by50（正方形アート）、ogp（敵同士チャートから切り出し）、hero-main（予備保存）。
残りプレースホルダー: なし。org-seigisha / org-resona は実素材に差し替え済み。
※動画のループ箇所（どの8秒を使うか）は指定があれば差し替え可能。

## 素材差し替えリスト（同名ファイルで上書きするだけ）

| ファイル | サイズ | 状態 |
|---|---|---|
| assets/video/bg-loop.mp4 | 720×1280 / 無音6-8秒 / 5MB以内 | 未配置（現在はposter表示） |
| assets/images/bg-poster.webp | 1080×1920 | プレースホルダー |
| assets/images/hero-main.webp | 1440×1920 | プレースホルダー（※現レイアウトはコピー優先のため未使用。使う場合は相談） |
| assets/images/character-shade.webp | 900×1350 | プレースホルダー |
| assets/images/character-echo.webp | 900×1350 | プレースホルダー |
| assets/images/org-seigisha.webp | 1200×800 | 実素材組み込み済み |
| assets/images/org-resona.webp | 1200×800 | 実素材組み込み済み |
| assets/images/music-50by50.webp | 1000×1000 | プレースホルダー |
| assets/images/ogp.jpg | 1200×630 | プレースホルダー（文字入り版に差し替え推奨） |

## TikTok投稿の埋め込み方法

推したい投稿が決まったら、その投稿の「シェア → 埋め込み」でコードをコピーし、
`index.html` 内の以下の部分と置き換えてください：

```html
<div class="tiktok-embed-slot" data-note="投稿embed差し込み位置">
  <p class="slot-label">最新投稿</p>
</div>
```

埋め込みが重い場合は現状のカード＋プロフィールリンクのままでも運用できます
（公開前チェックリストの「重い場合はリンク型に切替」に対応済み）。

## GitHub Pages 公開手順

1. GitHubで新規リポジトリ作成（例: `50by50-site`）
2. このフォルダの中身をそのままpush（index.htmlがルートに来るように）
3. リポジトリの Settings → Pages → Branch: main / root を選択 → Save
4. 数分後 `https://ユーザー名.github.io/50by50-site/` で公開

## 実装済みの仕様（管理表・トンマナ準拠）

- スマホファースト / PC表示は段差レイアウト（隣り合わせの非対称）に展開
- 確定パレットをCSS変数で実装（--logo-dark: #332763 ほか全色）/ 純黒不使用
- Heroコピー確定版5要素を表示順通りに配置
- 背景動画 opacity 0.3（規定0.25〜0.35内）/ autoplay muted loop playsinline / poster付き
- 動画未配置・再生不可時はposterに静かにフォールバック
- スクロールfade-in / prefers-reduced-motion対応
- OGPメタタグ設定済み / favicon設定済み
- AI利用表記はProjectセクション末尾に1箇所のみ（固定投稿方式と同方針）

## 50:50診断（新規追加: 2026-06-11）

Aboutセクション直後に `#diagnosis`（50:50 CHECK）を追加。
6問の二択 → 任務/感情の比率算出 → 結果カード画像を自動生成 → 共有/保存。
サーバー・外部ライブラリ不要、全てブラウザ内で完結します。

### 追加・変更ファイル
- `index.html` … 診断セクション挿入 / ヘッダーに「50:50」リンク追加 / `diagnosis.js` 読み込み
- `style.css` … `/* ===== 50:50 Check ===== */` ブロック追加（確定パレット準拠）
- `diagnosis.js` … 新規（診断ロジック＋Canvasカード生成＋共有）

### 公開前に1箇所だけ設定
`diagnosis.js` 冒頭の `DIAG_CONFIG.siteUrl` に公開URLを入れてください。
カード画像の下部とコピー用キャプションに焼き込まれます（未設定でも動作はします）。

### 文言の差し替え
- 設問: `QUESTIONS`（`w` はMISSION側を選んだ時の加点。**合計100を維持**）
- 結果タイプ: `TYPES`（タイプ名・英語表記・添えコピー）
- 重み配分 [15,18,16,17,15,19] は「MISSION回答数と結果帯が全64通りで一致する」よう検証済み。
  設問を増減する場合は帯の整合を取り直してください。

### 共有の仕様と制約
- スマホ: OSの共有シートが開き、TikTok / X / LINE等へ画像を直接渡せます
- 注意: **ハッシュタグは画像と一緒に自動では付きません**（プラットフォーム側の制約）。
  そのため「キャプションをコピー」ボタンと、カード画像への #50by50 焼き込みで補完しています
- 共有シート非対応の環境（主にPC）は自動でダウンロードにフォールバック
- カードは 1080×1440（3:4 / TikTok写真投稿サイズ）。Canvas描画なのでテンプレ画像は不要ですが、
  デザインを画像テンプレに差し替えたい場合は `generateCard()` の描画部分を `drawImage` に置き換え可能

## 2026-06-27 追加反映

- BGM ON/OFFボタンを追加。
  - 音源: `assets/audio/bgm-main.mp3`
  - 元ファイル: `はじまりの幻影都市_30秒ver (Fade Out) (Fade In).mp3`
  - ブラウザ仕様上、自動再生ではなくユーザーが `BGM OFF` ボタンを押した時に再生開始。
  - `loop` 指定済み。音量は `script.js` 側で 0.52 に設定。
- 組織イメージを実素材に差し替え。
  - `assets/images/org-seigisha.webp`
  - `assets/images/org-resona.webp`

