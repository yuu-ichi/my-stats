# my-stats

自分用のGitHub stats生成ツールです。リポジトリの言語使用率を可愛いドーナツチャート（SVG画像）として生成します。

![Stats SVG](./stats.svg)

## 特徴

- **ドーナツチャート**: 上位5言語 + Others で構成される円グラフ
- **テーマ切り替え**: ライト/ダークモードに対応し、配色も自動で切り替わります
    - **Light**: 明るくフレッシュなカラー（デフォルト）
    - **Dark**: 森をイメージした落ち着いたカラー
- **自動化**: GitHub Actions による定期実行（毎週金曜 23:00 UTC / JST(日本時間) 8:00）

## 必要要件

- Node.js (v18以上推奨)

## インストール

```bash
npm ci
```

## ローカルでの実行方法

### 1. 環境変数の設定

```bash
export GITHUB_USER="あなたのGitHubID"
export GITHUB_TOKEN="トークン"
```

### 2. 実行（開発モード）

`npm run dev` コマンドで、デフォルト設定（ライトモード & モックデータ）で実行できます。
APIを叩かずに、すぐに見た目を確認できます。

```bash
npm run dev
# 内部的には: THEME_MODE=light MOCK_DATA=true node generate-stats.js が実行されます
```

成功すると、カレントディレクトリに `stats.svg` が生成されます。

### テーマの切り替え

環境変数 `THEME_MODE` でテーマを強制できます。

```bash
# ダークモードでモックデータ実行
THEME_MODE=dark MOCK_DATA=true node generate-stats.js
```
