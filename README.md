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
残りプレースホルダー: org-seigisha / org-resona の2点のみ。
※動画のループ箇所（どの8秒を使うか）は指定があれば差し替え可能。

## 素材差し替えリスト（同名ファイルで上書きするだけ）

| ファイル | サイズ | 状態 |
|---|---|---|
| assets/video/bg-loop.mp4 | 720×1280 / 無音6-8秒 / 5MB以内 | 未配置（現在はposter表示） |
| assets/images/bg-poster.webp | 1080×1920 | プレースホルダー |
| assets/images/hero-main.webp | 1440×1920 | プレースホルダー（※現レイアウトはコピー優先のため未使用。使う場合は相談） |
| assets/images/character-shade.webp | 900×1350 | プレースホルダー |
| assets/images/character-echo.webp | 900×1350 | プレースホルダー |
| assets/images/org-seigisha.webp | 1200×800 | プレースホルダー |
| assets/images/org-resona.webp | 1200×800 | プレースホルダー |
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
