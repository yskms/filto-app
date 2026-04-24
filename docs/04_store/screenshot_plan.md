# スクリーンショット構成

## 方針

- 枚数：4枚（+ テーマ紹介用1枚を将来検討）
- テーマ：ライト統一
- 言語：日本語版 / 英語版 それぞれ撮影

---

## スクショ構成

| # | 画面 | 目的 |
|---|------|------|
| A | Home（記事一覧） | アプリの基本UX |
| B | FilterEdit | ブロック/許可キーワードの設定 |
| C | Filters一覧 | フィルタ管理のイメージ |
| D | FeedAdd | RSS登録の簡単さ |

---

## 登録するRSSフィード

### 日本語版

| フィード名 | URL |
|---|---|
| NHKニュース | `https://www.nhk.or.jp/rss/news/cat0.xml` |
| Gigazine | `https://gigazine.net/news/rss_2.0/` |
| ITmedia NEWS | `https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml` |
| 朝日新聞 | `https://www.asahi.com/rss/asahi/newsheadlines.rdf` |
| CNET Japan | `https://japan.cnet.com/rss/index.rdf` |

### 英語版

| フィード名 | URL |
|---|---|
| BBC News | `http://feeds.bbci.co.uk/news/rss.xml` |
| The Verge | `https://www.theverge.com/rss/index.xml` |
| TechCrunch | `https://techcrunch.com/feed/` |
| NASA | `https://www.nasa.gov/feed/` |
| The Guardian | `https://www.theguardian.com/world/rss` |

※ Reuters は無料RSS非対応のため除外。実際に登録前にアプリで動作確認すること。

---

## 日本語版

### B: FilterEdit

```
ブロックキーワード: 転職
許可キーワード:
  エンジニア
  デザイナー
```

### C: Filters一覧

| ブロックキーワード | 許可キーワード |
|---|---|
| 転職 | エンジニア, デザイナー |
| 芸能 | — |
| PR記事 | — |
| まとめ | — |
| FX | 仮想通貨, ビットコイン |

---

## 英語版

### B: FilterEdit

```
Block keyword: Politics
Allow keywords:
  Tech Policy
  Privacy
```

### C: Filters一覧

| Block | Allow |
|---|---|
| Politics | Tech Policy, Privacy |
| Sponsored | — |
| Celebrity | — |
| Opinion | — |
| Clickbait | — |
| Sports | Formula 1 |
