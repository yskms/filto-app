#!/bin/zsh
set -euo pipefail

# ストア掲載用スクリーンショットに見出し・補足・淡色背景を合成するスクリプト。
# 実機スクショはトリミングせず横幅全体を保ったまま拡大配置し、
# はみ出た下部はキャンバス外へ自然にクロップされる(DoneAgo型の構図)。
asset_dir="${0:A:h}"
src_dir="${asset_dir:h}/Screenshot"
en_dir="$asset_dir/en-US"
ja_dir="$asset_dir/ja-JP"

font_en_bold="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
font_en_reg="/System/Library/Fonts/Supplemental/Arial.ttf"
font_ja_bold="/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
font_ja_reg="/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"

canvas_w=1290
canvas_h=2796
shot_w=1170
corner=40

mkdir -p "$en_dir" "$ja_dir"

make_slide() {
  local input="$1"
  local output="$2"
  local headline="$3"
  local subhead="$4"
  local bg="$5"
  local font_bold="$6"
  local font_reg="$7"
  local headline_size="${8:-92}"
  local subhead_size="${9:-46}"
  local headline_color="${10:-#11181C}"
  local subhead_color="${11:-#55636B}"
  local border_color="${12:-}"

  # 見出しが1行だけの場合、2行分の高さを前提にした補足コピーの固定位置(470)では
  # 見出しと補足の間が間延びするため、行数に応じて詰める。
  local subhead_y=470
  if [[ "$headline" != *$'\n'* ]]; then
    subhead_y=$(( 140 + (headline_size * 12 / 10) + 70 ))
  fi
  local shot_y=$(( subhead_y + (subhead_size * 12 / 10) + 85 ))

  local base="$asset_dir/.tmp-base.png"
  local rounded="$asset_dir/.tmp-rounded.png"
  local shadowed="$asset_dir/.tmp-shadowed.png"

  magick -size ${canvas_w}x${canvas_h} xc:"$bg" \
    -font "$font_bold" -fill "$headline_color" -pointsize "$headline_size" -gravity north \
    -interline-spacing 14 -annotate +0+140 "$headline" \
    -font "$font_reg" -fill "$subhead_color" -pointsize "$subhead_size" -gravity north \
    -annotate +0+${subhead_y} "$subhead" \
    "$base"

  magick "$input" -resize ${shot_w}x \
    \( +clone -alpha extract -draw "fill black polygon 0,0 0,$corner $corner,0 fill white circle $corner,$corner $corner,0" \
       \( +clone -flip \) -compose Multiply -composite \
       \( +clone -flop \) -compose Multiply -composite \
    \) -alpha off -compose CopyOpacity -composite \
    "$rounded"

  if [[ -n "$border_color" ]]; then
    read -r shot_rw shot_rh <<< "$(magick identify -format '%w %h' "$rounded")"
    magick "$rounded" -fill none -stroke "$border_color" -strokewidth 2 \
      -draw "roundrectangle 1,1 $((shot_rw - 2)),$((shot_rh - 2)) $corner,$corner" \
      "$rounded"
  fi

  magick "$rounded" \( +clone -background black -shadow 30x25+0+18 \) +swap \
    -background none -layers merge +repage \
    "$shadowed"

  magick "$base" "$shadowed" -gravity north -geometry +0+${shot_y} -compose over -composite \
    -crop ${canvas_w}x${canvas_h}+0+0 +repage \
    -strip -colorspace sRGB -alpha off \
    "$output"

  rm -f "$base" "$rounded" "$shadowed"
}

bg_brand='#D8ECF1'
bg_accent='#FBE0D0'
bg_dark='#101820'
fg_dark_headline='#F5F7F8'
fg_dark_subhead='#A9B4BA'
border_dark='#2A343C'

make_slide "$src_dir/ss_home_.png" "$en_dir/01-less-noise.png" \
  $'Less noise.\nMore of what matters.' \
  "Filter out the stories you don't want." \
  "$bg_brand" "$font_en_bold" "$font_en_reg"

make_slide "$src_dir/ss_filters.png" "$en_dir/02-your-rules.png" \
  $'Your feed.\nYour rules.' \
  'Create filters for topics you want to hide.' \
  "$bg_brand" "$font_en_bold" "$font_en_reg"

make_slide "$src_dir/ss_edit_filter.png" "$en_dir/03-block-broadly.png" \
  $'Block broadly.\nKeep exceptions.' \
  'Block keywords, then allow what still matters.' \
  "$bg_accent" "$font_en_bold" "$font_en_reg"

make_slide "$src_dir/ss_add_feed.png" "$en_dir/04-bring-your-feeds.png" \
  $'Bring your\nfavorite feeds.' \
  'Add any RSS feed and make it yours.' \
  "$bg_brand" "$font_en_bold" "$font_en_reg"

make_slide "$src_dir/ss_home_bigpic.png" "$en_dir/05-read-your-way.png" \
  $'Read it\nyour way.' \
  'Choose the layout that feels right.' \
  "$bg_brand" "$font_en_bold" "$font_en_reg"

make_slide "$src_dir/ss_home_dark.png" "$en_dir/06-easy-on-the-eyes.png" \
  $'Easy on\nthe eyes.' \
  'Comfortable reading, day or night.' \
  "$bg_dark" "$font_en_bold" "$font_en_reg" 92 46 "$fg_dark_headline" "$fg_dark_subhead" "$border_dark"

make_slide "$src_dir/ss_home_jp.png" "$ja_dir/01-less-noise.png" \
  $'読みたい記事だけ、\nもっと快適に。' \
  '読みたくない記事を自動でフィルタ。' \
  "$bg_brand" "$font_ja_bold" "$font_ja_reg" 84 42

make_slide "$src_dir/ss_filters_jp.png" "$ja_dir/02-your-rules.png" \
  $'あなたのフィードに、\nあなたのルールを。' \
  'キーワードで自由にフィルタを作成。' \
  "$bg_brand" "$font_ja_bold" "$font_ja_reg" 84 42

make_slide "$src_dir/ss_edit_filter_jp.png" "$ja_dir/03-block-broadly.png" \
  $'まとめて除外。\n必要なものは残す。' \
  'BlockとAllowを組み合わせて細かく調整。' \
  "$bg_accent" "$font_ja_bold" "$font_ja_reg" 84 42

make_slide "$src_dir/ss_add_feed_jp.png" "$ja_dir/04-bring-your-feeds.png" \
  $'好きなサイトを、\nひとつに。' \
  'RSSフィードを追加して、自分だけの一覧に。' \
  "$bg_brand" "$font_ja_bold" "$font_ja_reg" 84 42

make_slide "$src_dir/ss_home_bigpic_jp.png" "$ja_dir/05-read-your-way.png" \
  $'読み方も、\n自分好みに。' \
  '見やすいレイアウトに切り替え。' \
  "$bg_brand" "$font_ja_bold" "$font_ja_reg" 84 42

make_slide "$src_dir/ss_home_dark_jp.png" "$ja_dir/06-easy-on-the-eyes.png" \
  $'目にやさしく、\n読みやすく。' \
  '昼も夜も、快適に読めます。' \
  "$bg_dark" "$font_ja_bold" "$font_ja_reg" 84 42 "$fg_dark_headline" "$fg_dark_subhead" "$border_dark"
