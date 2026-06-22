// 自動生成されたデフォルトフィード一覧（scripts/verify-feeds.mjs で実URL検証済み）
// すべて「取得成功 + 記事にサムネイル画像が存在する」ことを確認したフィードのみ収録。
// 収録数: JA 59件 / EN 86件
// 再生成: node scripts/verify-feeds.mjs > scripts/verify-results.json && node scripts/generate-default-feeds.mjs

export type DefaultFeedItem = { id: string; title: string; url: string };
export type DefaultFeedCategory = { id: string; label: string; feeds: DefaultFeedItem[] };

export const DEFAULT_FEED_CATEGORIES: Record<'ja' | 'en', DefaultFeedCategory[]> = {
  ja: [
  {
    id: "news",
    label: "ニュース",
    feeds: [
      { id: "default_ja_buzzfeed", title: "BuzzFeed Japan", url: "https://www.buzzfeed.com/jp.xml" },
      { id: "default_ja_huffingtonpost", title: "HuffPost Japan", url: "https://www.huffingtonpost.jp/feeds/index.xml" },
      { id: "default_ja_dailyshincho", title: "デイリー新潮", url: "https://www.dailyshincho.jp/feed/" },
      { id: "default_ja_livedoor", title: "ライブドアニュース", url: "https://news.livedoor.com/topics/rss/top.xml" },
      { id: "default_ja_gendai", title: "現代ビジネス", url: "https://gendai.media/list/feed/rss" },
    ],
  },
  {
    id: "tech",
    label: "テクノロジー",
    feeds: [
      { id: "default_ja_ascii", title: "ASCII.jp", url: "https://ascii.jp/rss.xml" },
      { id: "default_ja_appbank", title: "AppBank", url: "https://www.appbank.net/feed" },
      { id: "default_ja_japan", title: "CNET Japan", url: "https://japan.cnet.com/rss/index.rdf" },
      { id: "default_ja_iphonemania", title: "iPhone Mania", url: "https://iphone-mania.jp/feed/" },
      { id: "default_ja_buzzap", title: "Buzzap!", url: "https://buzzap.jp/feed" },
      { id: "default_ja_smhn", title: "すまほん!!", url: "https://smhn.info/feed" },
      { id: "default_ja_gizmodo", title: "ギズモード・ジャパン", url: "https://www.gizmodo.jp/index.xml" },
      { id: "default_ja_lifehacker", title: "ライフハッカー・ジャパン", url: "https://www.lifehacker.jp/feed/index.xml" },
      { id: "default_ja_qetic", title: "Qetic", url: "https://qetic.jp/feed" },
      { id: "default_ja_technoedge", title: "テクノエッジ", url: "https://www.techno-edge.net/rss20/index.rdf" },
    ],
  },
  {
    id: "business",
    label: "ビジネス・マネー",
    feeds: [
      { id: "default_ja_businessinsider", title: "ビジネスインサイダー日本版", url: "https://www.businessinsider.jp/feed/index.xml" },
      { id: "default_ja_zuuonline", title: "ZUU online", url: "https://zuuonline.com/feed" },
      { id: "default_ja_toyokeizai", title: "東洋経済オンライン", url: "https://toyokeizai.net/list/feed/rss" },
      { id: "default_ja_financialfield", title: "ファイナンシャルフィールド", url: "https://financial-field.com/feed" },
    ],
  },
  {
    id: "science",
    label: "サイエンス",
    feeds: [
      { id: "default_ja_wired", title: "WIRED.jp", url: "https://wired.jp/feed/rss" },
      { id: "default_ja_nazology", title: "ナゾロジー", url: "https://nazology.kusuguru.co.jp/feed" },
    ],
  },
  {
    id: "dev",
    label: "開発・プログラミング",
    feeds: [
      { id: "default_ja_zenn", title: "Zenn", url: "https://zenn.dev/feed" },
    ],
  },
  {
    id: "game",
    label: "ゲーム",
    feeds: [
      { id: "default_ja_automatonmedia", title: "AUTOMATON", url: "https://automaton-media.com/feed/" },
    ],
  },
  {
    id: "anime",
    label: "アニメ・マンガ",
    feeds: [
      { id: "default_ja_magmix", title: "マグミクス", url: "https://magmix.jp/feed" },
    ],
  },
  {
    id: "entertainment",
    label: "エンタメ・音楽",
    feeds: [
      { id: "default_ja_cinra", title: "CINRA NEWS", url: "https://www.cinra.net/feed" },
      { id: "default_ja_barks", title: "BARKS", url: "https://www.barks.jp/feed/" },
      { id: "default_ja_thefirsttimes", title: "THE FIRST TIMES", url: "https://thefirsttimes.jp/feed" },
      { id: "default_ja_mdpr", title: "モデルプレス", url: "https://feed.mdpr.jp/rss/export/mdpr-entertainment.xml" },
    ],
  },
  {
    id: "sports",
    label: "スポーツ",
    feeds: [
      { id: "default_ja_gekisaka", title: "ゲキサカ", url: "https://web.gekisaka.jp/feed" },
      { id: "default_ja_fullcount", title: "Full-Count", url: "https://full-count.jp/feed" },
      { id: "default_ja_footballchannel", title: "フットボールチャンネル", url: "https://www.footballchannel.jp/feed" },
    ],
  },
  {
    id: "fitness",
    label: "フィットネス・健康",
    feeds: [
      { id: "default_ja_melos", title: "MELOS", url: "https://melos.media/feed" },
      { id: "default_ja_magazineworld", title: "Tarzan", url: "https://magazineworld.jp/tarzan/feed/" },
      { id: "default_ja_fytte", title: "FYTTE", url: "https://fytte.jp/feed" },
      { id: "default_ja_womenshealthmag", title: "Women's Health", url: "https://www.womenshealthmag.com/jp/rss/all.xml/" },
      { id: "default_ja_yogagene", title: "ヨガジェネレーション", url: "https://www.yoga-gene.com/feed" },
      { id: "default_ja_triathlonlumina", title: "TRIATHLON LUMINA", url: "https://triathlon-lumina.com/feed" },
      { id: "default_ja_vokka", title: "VOKKA", url: "https://vokka.jp/feed" },
    ],
  },
  {
    id: "fashion",
    label: "ファッション・美容",
    feeds: [
      { id: "default_ja_gingerweb", title: "GINGER", url: "https://gingerweb.jp/feed" },
      { id: "default_ja_oggi", title: "Oggi.jp", url: "https://oggi.jp/feed" },
      { id: "default_ja_cancam", title: "CanCam.jp", url: "https://cancam.jp/feed" },
      { id: "default_ja_hanako", title: "Hanako", url: "https://hanako.tokyo/feed/" },
      { id: "default_ja_vogue", title: "VOGUE JAPAN", url: "https://www.vogue.co.jp/feed/rss" },
      { id: "default_ja_wwdjapan", title: "WWD JAPAN", url: "https://www.wwdjapan.com/feed" },
      { id: "default_ja_biteki", title: "美的.com", url: "https://www.biteki.com/feed" },
    ],
  },
  {
    id: "lifestyle",
    label: "ライフスタイル",
    feeds: [
      { id: "default_ja_casabrutus", title: "Casa BRUTUS", url: "https://casabrutus.com/feed" },
      { id: "default_ja_youpouch", title: "Pouch (youpouch)", url: "https://youpouch.com/feed" },
      { id: "default_ja_roomclip", title: "RoomClip mag", url: "https://roomclip.jp/mag/feed" },
      { id: "default_ja_roomie", title: "ROOMIE", url: "https://www.roomie.jp/feed/" },
      { id: "default_ja_tabilabo", title: "TABI LABO", url: "https://tabi-labo.com/feed" },
      { id: "default_ja_rocketnews24", title: "ロケットニュース24", url: "https://rocketnews24.com/feed/" },
      { id: "default_ja_grapee", title: "grape", url: "https://grapee.jp/feed" },
      { id: "default_ja_getnavi", title: "GetNavi web", url: "https://getnavi.jp/feed/" },
      { id: "default_ja_yahoo", title: "Lmaga.jp", url: "https://news.yahoo.co.jp/rss/media/lmaga/all.xml" },
    ],
  },
  {
    id: "food",
    label: "グルメ・料理",
    feeds: [
      { id: "default_ja_kufura", title: "kufura", url: "https://kufura.jp/feed" },
    ],
  },
  {
    id: "auto",
    label: "自動車",
    feeds: [
      { id: "default_ja_automesseweb", title: "Auto Messe Web", url: "https://www.automesseweb.jp/feed" },
      { id: "default_ja_bestcarweb", title: "ベストカーWeb", url: "https://bestcarweb.jp/feed" },
      { id: "default_ja_clicccar", title: "clicccar", url: "https://clicccar.com/feed" },
    ],
  },
  {
    id: "travel",
    label: "旅行",
    feeds: [
      { id: "default_ja_tabippo", title: "TABIPPO.NET", url: "https://tabippo.net/feed" },
    ],
  },
  ],
  en: [
  {
    id: "world",
    label: "World News",
    feeds: [
      { id: "default_en_bbci", title: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { id: "default_en_nytimes", title: "New York Times Home", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
      { id: "default_en_bbci2", title: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
      { id: "default_en_nytimes2", title: "New York Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
      { id: "default_en_npr", title: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
      { id: "default_en_cbsnews", title: "CBS News", url: "https://www.cbsnews.com/latest/rss/main" },
      { id: "default_en_time", title: "Time", url: "https://time.com/feed/" },
      { id: "default_en_skynews", title: "Sky News World", url: "https://feeds.skynews.com/feeds/rss/world.xml" },
    ],
  },
  {
    id: "tech",
    label: "Technology",
    feeds: [
      { id: "default_en_9to5google", title: "9to5Google", url: "https://9to5google.com/feed/" },
      { id: "default_en_arstechnica", title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { id: "default_en_engadget", title: "Engadget", url: "https://www.engadget.com/rss.xml" },
      { id: "default_en_androidauthority", title: "Android Authority", url: "https://www.androidauthority.com/feed/" },
      { id: "default_en_mashable", title: "Mashable", url: "https://mashable.com/feeds/rss/all" },
      { id: "default_en_digitaltrends", title: "Digital Trends", url: "https://www.digitaltrends.com/feed/" },
      { id: "default_en_androidpolice", title: "Android Police", url: "https://www.androidpolice.com/feed/" },
      { id: "default_en_techradar", title: "TechRadar", url: "https://www.techradar.com/rss" },
      { id: "default_en_theverge", title: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { id: "default_en_wired", title: "Wired", url: "https://www.wired.com/feed/rss" },
      { id: "default_en_venturebeat", title: "VentureBeat", url: "https://venturebeat.com/feed/" },
      { id: "default_en_gizmodo", title: "Gizmodo", url: "https://gizmodo.com/rss" },
      { id: "default_en_thenextweb", title: "The Next Web", url: "https://thenextweb.com/feed" },
      { id: "default_en_tomshardware", title: "Tom's Hardware", url: "https://www.tomshardware.com/feeds/all" },
      { id: "default_en_9to5mac", title: "9to5Mac", url: "https://9to5mac.com/feed/" },
      { id: "default_en_theregister", title: "The Register", url: "https://www.theregister.com/headlines.atom" },
      { id: "default_en_macrumors", title: "MacRumors", url: "https://feeds.macrumors.com/MacRumors-All" },
    ],
  },
  {
    id: "business",
    label: "Business",
    feeds: [
      { id: "default_en_fastcompany", title: "Fast Company", url: "https://www.fastcompany.com/latest/rss" },
      { id: "default_en_forbes", title: "Forbes Business", url: "https://www.forbes.com/business/feed/" },
      { id: "default_en_fortune", title: "Fortune", url: "https://fortune.com/feed/" },
      { id: "default_en_dowjones", title: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
    ],
  },
  {
    id: "science",
    label: "Science",
    feeds: [
      { id: "default_en_newscientist", title: "New Scientist", url: "https://www.newscientist.com/feed/home/" },
      { id: "default_en_quantamagazine", title: "Quanta Magazine", url: "https://www.quantamagazine.org/feed/" },
      { id: "default_en_phys", title: "Phys.org", url: "https://phys.org/rss-feed/" },
      { id: "default_en_livescience", title: "Live Science", url: "https://www.livescience.com/feeds/all" },
      { id: "default_en_space", title: "Space.com", url: "https://www.space.com/feeds/all" },
    ],
  },
  {
    id: "game",
    label: "Gaming",
    feeds: [
      { id: "default_en_gamespot", title: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/" },
      { id: "default_en_gamesradar", title: "GamesRadar+", url: "https://www.gamesradar.com/rss/" },
      { id: "default_en_eurogamer", title: "Eurogamer", url: "https://www.eurogamer.net/feed" },
      { id: "default_en_ign", title: "IGN", url: "https://feeds.ign.com/ign/all" },
      { id: "default_en_nintendolife", title: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest" },
      { id: "default_en_kotaku", title: "Kotaku", url: "https://kotaku.com/rss" },
      { id: "default_en_vg247", title: "VG247", url: "https://www.vg247.com/feed" },
      { id: "default_en_pcgamer", title: "PC Gamer", url: "https://www.pcgamer.com/rss/" },
      { id: "default_en_polygon", title: "Polygon", url: "https://www.polygon.com/rss/index.xml" },
      { id: "default_en_rockpapershotgun", title: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed" },
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    feeds: [
      { id: "default_en_pitchfork", title: "Pitchfork", url: "https://pitchfork.com/rss/news/" },
      { id: "default_en_deadline", title: "Deadline", url: "https://deadline.com/feed/" },
      { id: "default_en_billboard", title: "Billboard", url: "https://www.billboard.com/feed/" },
      { id: "default_en_variety", title: "Variety", url: "https://variety.com/feed/" },
    ],
  },
  {
    id: "sports",
    label: "Sports",
    feeds: [
      { id: "default_en_bbci3", title: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
      { id: "default_en_skysports", title: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
      { id: "default_en_cbssports", title: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/" },
    ],
  },
  {
    id: "fitness",
    label: "Fitness & Health",
    feeds: [
      { id: "default_en_self", title: "Self", url: "https://www.self.com/feed/rss" },
      { id: "default_en_menshealth", title: "Men's Health", url: "https://www.menshealth.com/rss/all.xml/" },
      { id: "default_en_womenshealthmag", title: "Women's Health", url: "https://www.womenshealthmag.com/rss/all.xml/" },
      { id: "default_en_runnersworld", title: "Runner's World", url: "https://www.runnersworld.com/rss/all.xml/" },
      { id: "default_en_prevention", title: "Prevention", url: "https://www.prevention.com/rss/all.xml/" },
      { id: "default_en_bicycling", title: "Bicycling", url: "https://www.bicycling.com/rss/all.xml/" },
      { id: "default_en_healthline", title: "Healthline", url: "https://www.healthline.com/rss/health-news" },
      { id: "default_en_eatthis", title: "Eat This Not That", url: "https://www.eatthis.com/feed/" },
      { id: "default_en_breakingmuscle", title: "Breaking Muscle", url: "https://breakingmuscle.com/feed/" },
      { id: "default_en_yogajournal", title: "Yoga Journal", url: "https://www.yogajournal.com/feed/" },
      { id: "default_en_triathlete", title: "Triathlete", url: "https://www.triathlete.com/feed/" },
      { id: "default_en_trailrunnermag", title: "Trail Runner", url: "https://www.trailrunnermag.com/feed/" },
      { id: "default_en_irunfar", title: "iRunFar", url: "https://www.irunfar.com/feed" },
      { id: "default_en_muscleandfitness", title: "Muscle & Fitness", url: "https://www.muscleandfitness.com/feed/" },
      { id: "default_en_mensjournal", title: "Men's Journal", url: "https://www.mensjournal.com/feed/" },
    ],
  },
  {
    id: "design",
    label: "Design",
    feeds: [
      { id: "default_en_dezeen", title: "Dezeen", url: "https://www.dezeen.com/feed/" },
      { id: "default_en_thisiscolossal", title: "Colossal", url: "https://www.thisiscolossal.com/feed/" },
      { id: "default_en_smashingmagazine", title: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/" },
      { id: "default_en_designboom", title: "Designboom", url: "https://www.designboom.com/feed/" },
    ],
  },
  {
    id: "fashion",
    label: "Fashion & Beauty",
    feeds: [
      { id: "default_en_elle", title: "Elle", url: "https://www.elle.com/rss/all.xml/" },
      { id: "default_en_vogue", title: "Vogue", url: "https://www.vogue.com/feed/rss" },
      { id: "default_en_harpersbazaar", title: "Harper's Bazaar", url: "https://www.harpersbazaar.com/rss/all.xml/" },
      { id: "default_en_www", title: "GQ", url: "https://www.gq.com/feed/rss" },
    ],
  },
  {
    id: "food",
    label: "Food",
    feeds: [
      { id: "default_en_eater", title: "Eater", url: "https://www.eater.com/rss/index.xml" },
      { id: "default_en_bonappetit", title: "Bon Appetit", url: "https://www.bonappetit.com/feed/rss" },
      { id: "default_en_epicurious", title: "Epicurious", url: "https://www.epicurious.com/feed/rss" },
    ],
  },
  {
    id: "auto",
    label: "Auto",
    feeds: [
      { id: "default_en_caranddriver", title: "Car and Driver", url: "https://www.caranddriver.com/rss/all.xml/" },
      { id: "default_en_autoblog", title: "Autoblog", url: "https://www.autoblog.com/rss.xml" },
      { id: "default_en_jalopnik", title: "Jalopnik", url: "https://jalopnik.com/rss" },
      { id: "default_en_electrek", title: "Electrek", url: "https://electrek.co/feed/" },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    feeds: [
      { id: "default_en_cntraveler", title: "Conde Nast Traveler", url: "https://www.cntraveler.com/feed/rss" },
    ],
  },
  {
    id: "culture",
    label: "Culture",
    feeds: [
      { id: "default_en_vox", title: "Vox", url: "https://www.vox.com/rss/index.xml" },
      { id: "default_en_slate", title: "Slate", url: "https://slate.com/feeds/all.rss" },
      { id: "default_en_buzzfeed", title: "BuzzFeed", url: "https://www.buzzfeed.com/index.xml" },
      { id: "default_en_vice", title: "Vice", url: "https://www.vice.com/en/rss" },
    ],
  },
  ],
};

/** カテゴリをまたいでフラットなフィード配列を返す */
export function getDefaultFeedsFlat(lang: 'ja' | 'en'): DefaultFeedItem[] {
  return DEFAULT_FEED_CATEGORIES[lang].flatMap((c) => c.feeds);
}
