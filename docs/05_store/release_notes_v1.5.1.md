# リリースノート v1.5.1

App Store の「このバージョンの最新情報」／Google Play の「最新情報」に貼り付け可能。
文字数は Google Play の上限（各言語500字）内。

主なユーザー向け変更：記事の保持期間を見直し（既定30日→90日、7日・30日の選択肢を廃止）、
記事の手動削除機能を廃止。

## ⚠️ iOSとAndroidで文面が違う

**v1.5.0 の公開状況がプラットフォームで食い違っているため、貼り付ける文面が異なる。**

- **Android**: 1.5.0 は 2026-09-01 に審査通過・公開済み。→ **1.5.1の内容だけ**でよい。
- **iOS**: 1.5.0 は審査で自動リジェクトされ、**一度もユーザーに届いていない**（利用者は1.4.0）。
  → **1.5.0 と 1.5.1 の両方**を載せる必要がある。1.5.0分だけ、または1.5.1分だけだと
  ユーザーから見て変更内容が欠ける。

---

## iOS 用（1.5.0 + 1.5.1）

### 日本語

```
・広告を導入しました（興味関心に基づかない非パーソナライズ広告のみで、行動を追跡することはありません）
・Filto Proを追加しました。月額100円で広告を非表示にでき、フィルタ・許可キーワードの件数上限も解除されます
・無料版はフィルタ10件・グローバル許可キーワード2件までとなります（既存の登録内容はそのままご利用いただけます）
・記事の保持期間の既定を90日に延ばしました。短い保持期間では、消えた記事が次の取得で未読として戻ってくることがあったためです
・記事の手動削除を廃止しました。削除しても次の取得で戻ってくるため、期待どおりに動作していませんでした。不要な記事の整理は保持期間の設定をご利用ください
```

### English

```
• Added ads (non-personalized only — we never track your behavior)
• Introduced Filto Pro: for $0.99/month, remove ads and unlock unlimited filters and allow keywords
• The free version is now limited to 10 filters and 2 global allow keywords (your existing ones are unaffected)
• The default article retention period is now 90 days. With shorter periods, deleted articles could come back as unread on the next fetch
• Removed manual article deletion. Deleted articles came back on the next fetch, so it never worked as expected — use the retention period setting instead
```

---

## Android 用（1.5.1 のみ）

### 日本語

```
・記事の保持期間の既定を90日に延ばしました。短い保持期間では、消えた記事が次の取得で未読として戻ってくることがあったためです
・保持期間の選択肢を90日 / 180日 / 無制限に整理しました（7日・30日をお使いの場合は90日に変更されます。記事が余分に消えることはありません）
・記事の手動削除を廃止しました。削除しても次の取得で戻ってくるため、期待どおりに動作していませんでした。不要な記事の整理は保持期間の設定をご利用ください
```

### English

```
• The default article retention period is now 90 days. With shorter periods, deleted articles could come back as unread on the next fetch
• Retention options are now 90 days / 180 days / unlimited (if you had 7 or 30 days, it becomes 90 — no extra articles are deleted)
• Removed manual article deletion. Deleted articles came back on the next fetch, so it never worked as expected — use the retention period setting instead
```
