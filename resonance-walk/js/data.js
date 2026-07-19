/* =========================================================
 * 50by50 Resonance Walk — data.js
 * 企画設計書 v1.0 §12 のJSONスキーマをJS形式で保持する。
 * （file:// 直開き時のCORS制約を避けるため .json ではなく .js。
 *   構造はそのまま React/PixiJS 版へ移植できる）
 *
 * 地点・ログ・調査ポイントの追加はこのファイルの編集だけで完結する。
 * ======================================================= */
window.RW_DATA = {

  ui_theme: {
    base: "#F7F7FA", lavender: "#C9B8E8", violet: "#7B6CE0",
    wisteria: "#B79FE0", navy: "#1B2140", line_px: 1
  },

  /* 導線リンク（タイトル画面のみに表示。探索中は出さない）
     href が空文字のものは「準備中」表示になる。 */
  links: [
    { label: "小説版（Kindle）",     href: "" },                                          /* 要確認：KindleのURL */
    { label: "ノベルゲーム（準備中）", href: "" },
    { label: "公式SNS",             href: "https://www.tiktok.com/@renfew_ito" },
    { label: "LP",                  href: "https://yuukigenira-dev.github.io/50by50-lp/" }
  ],

  /* 画面用BGM（地点以外） */
  screens_bgm: {
    title:    { src: "assets/bgm/bgm_title.mp3",    gain: 0.91 },  /* はじまりの幻影都市 */
    complete: { src: "assets/bgm/bgm_complete.mp3", gain: 1.10 }   /* 50by50（主題歌） */
  },

  player: {
    id: "rui", display: "SHADE", speed: 140,
    sprite_set: "SPR_RUI_SET01", start_location: "loc_plaza"
  },

  sprites: {
    SPR_RUI_SET01: {
      /* v1.1はImage2生成画を透明化・規格統一した4ポーズを使用。
         左向きは walk_r を含む全ポーズを描画時に水平反転する。 */
      use_atlas: true,
      atlas_img: "assets/sprites/rui_v1_1.png",
      atlas_frames: "assets/sprites/rui_v1_1_frames.js", /* window.RW_ATLAS を定義するJS */
      anims: { idle: 1, walk_r: 1, inspect: 1, react: 1 },
      anchor: [0.5, 1.0], frame_size: [600, 900]
    }
  },

  /* ---- MVP 5地点 -------------------------------------- */
  locations: [
    {
      location_id: "loc_plaza",
      name: "閉鎖された円形広場",
      spoiler_tier: 0, unlocked_by: null,
      world_w: 2.4,                       /* ビューポート幅の倍率 */
      time: "night",
      bg: { type: "image", src: "assets/bg/bg_plaza_v.jpg", wash: 0.04, deco: "plaza" },
      ambient: "amb_plaza",
      bgm: { src: "assets/bgm/bgm_plaza.mp3", gain: 0.98 },      /* 御影泪のテーマ */
      interactables: ["it_plaza_center", "it_plaza_stand"]
    },
    {
      location_id: "loc_corridor",
      name: "第七層ガラス遊歩通路",
      spoiler_tier: 0, unlocked_by: null,
      world_w: 2.8,
      time: "night",
      bg: { type: "image", src: "assets/bg/bg_corridor_night_v.jpg", wash: 0.02, deco: "corridor" },
      ambient: "amb_corridor",
      bgm: { src: "assets/bgm/bgm_corridor.mp3", gain: 1.08 },   /* 駆け引き */
      interactables: ["it_corridor_glass", "it_corridor_panel"]
    },
    {
      location_id: "loc_rain_roof",
      name: "雨の屋上（旧市街第三層）",
      spoiler_tier: 1,
      unlocked_by: { type: "logs_collected", value: ["log_plaza_01", "log_corridor_01"] },
      world_w: 2.2,
      time: "rain",
      bg: { type: "image", src: "assets/bg/bg_rain_roof_v.jpg", wash: 0.02, deco: "roof" },
      ambient: "amb_rain",
      bgm: { src: "assets/bgm/bgm_roof.mp3", gain: 0.69 },       /* 記憶の断片 */
      rain: true,
      edge_guard: "right",                /* 縁：泪が自分で半歩引く */
      interactables: ["it_roof_antenna", "it_roof_edge"]
    },
    {
      location_id: "loc_seigisha_lab",
      name: "星儀社メインフロア",
      spoiler_tier: 0, unlocked_by: null,
      world_w: 2.4,
      time: "interior",
      bg: { type: "image", src: "assets/bg/bg_seigisha_main_v.jpg", wash: 0.04, deco: "lab" },
      ambient: "amb_lab",
      bgm: { src: "assets/bgm/bgm_seigisha.mp3", gain: 0.87 },   /* 星儀社（b03指定） */
      interactables: ["it_lab_console", "it_lab_screen"]
    },
    {
      location_id: "loc_resona_room",
      name: "レゾナ調整室（傍受再現）",
      spoiler_tier: 1,
      unlocked_by: { type: "logs_collected", value: ["log_roof_01"] },
      world_w: 2.2,
      time: "interior",
      bg: { type: "image", src: "assets/bg/resona.jpg", wash: 0.22, deco: "resona" },
      ambient: "amb_resona",
      bgm: { src: "assets/bgm/bgm_resona.mp3", gain: 0.87 },     /* レゾナコード */
      interactables: ["it_resona_orb", "it_resona_chair"]
    }
  ],

  /* ---- 画面端遷移 -------------------------------------- */
  connections: [
    { from: "loc_plaza",    to: "loc_corridor",  edge: "right" },
    { from: "loc_corridor", to: "loc_plaza",     edge: "left"  },
    { from: "loc_corridor", to: "loc_rain_roof", edge: "right" },
    { from: "loc_rain_roof", to: "loc_corridor", edge: "left"  }
  ],

  /* ---- マップ（星図風ノード座標 0..1） ------------------ */
  map_nodes: {
    loc_plaza:        { x: 0.24, y: 0.62 },
    loc_corridor:     { x: 0.46, y: 0.40 },
    loc_rain_roof:    { x: 0.72, y: 0.26 },
    loc_seigisha_lab: { x: 0.30, y: 0.22 },
    loc_resona_room:  { x: 0.76, y: 0.66 }
  },
  map_edges: [
    ["loc_plaza", "loc_corridor"],
    ["loc_corridor", "loc_rain_roof"],
    ["loc_plaza", "loc_seigisha_lab"],
    ["loc_corridor", "loc_resona_room"]
  ],

  /* ---- 調査ポイント ------------------------------------ */
  interactables: [
    { id: "it_plaza_center",  location: "loc_plaza",    x: 0.50, type: "log",  log_id: "log_plaza_01",   hud: "ring", anim: "inspect" },
    { id: "it_plaza_stand",   location: "loc_plaza",    x: 0.78, type: "echo", echo_fx: "fx_gather",     hud: "ring", anim: "react"   },
    { id: "it_corridor_panel",location: "loc_corridor", x: 0.38, type: "log",  log_id: "log_corridor_01",hud: "ring", anim: "inspect" },
    { id: "it_corridor_glass",location: "loc_corridor", x: 0.72, type: "echo", echo_fx: "fx_outline",    hud: "ring", anim: "react"   },
    { id: "it_roof_antenna",  location: "loc_rain_roof",x: 0.42, type: "log",  log_id: "log_roof_01",    hud: "ring", anim: "inspect" },
    { id: "it_roof_edge",     location: "loc_rain_roof",x: 0.88, type: "echo", echo_fx: "fx_breath",     hud: "ring", anim: "react"   },
    { id: "it_lab_console",   location: "loc_seigisha_lab", x: 0.44, type: "log",  log_id: "log_lab_01",  hud: "ring", anim: "inspect" },
    { id: "it_lab_screen",    location: "loc_seigisha_lab", x: 0.74, type: "echo", echo_fx: "fx_mismatch",hud: "ring", anim: "react"   },
    { id: "it_resona_orb",    location: "loc_resona_room",  x: 0.40, type: "log",  log_id: "log_resona_01",hud: "ring", anim: "inspect" },
    { id: "it_resona_chair",  location: "loc_resona_room",  x: 0.70, type: "echo", echo_fx: "fx_sit",     hud: "ring", anim: "react"   }
  ],

  /* ---- ログ（本文は設計書§7の例文のみ。新規物語テキストなし） ---- */
  logs: [
    { log_id: "log_plaza_01",    spoiler_tier: 0, title: "観測記録 07-233",
      label: "観測記録", body: "広場で楽音一件。発信源、追跡せず。", style: "seigisha_report" },
    { log_id: "log_corridor_01", spoiler_tier: 0, title: "交戦記録 07-118",
      label: "交戦記録", body: "対象ECHOと接触。決着、〇件。", style: "seigisha_report" },
    { log_id: "log_roof_01",     spoiler_tier: 1, title: "異常記録 04-071",
      label: "異常記録", body: "無音の送信を観測。前後二分の記録が、ない。", style: "seigisha_report" },
    { log_id: "log_lab_01",      spoiler_tier: 0, title: "定期報告 07-240",
      label: "報告書",   body: "特記事項：（空欄）", style: "seigisha_report" },
    { log_id: "log_resona_01",   spoiler_tier: 1, title: "傍受断片 ██-███",
      label: "傍受断片", body: "調整、進行率七〇％。……ここで何かが、空になる。", style: "intercept" },
    /* Tierゲート動作確認用のロック枠（本文なし。表示は常に白伏せ文言のみ） */
    { log_id: "log_sealed_01",   spoiler_tier: 2, title: "記録 ██-███",
      label: "──",     body: "", style: "sealed" }
  ],

  unlock_conditions: [
    { target: "loc_rain_roof",   type: "logs_collected", value: ["log_plaza_01", "log_corridor_01"] },
    { target: "loc_resona_room", type: "logs_collected", value: ["log_roof_01"] },
    { target: "tier2_content",   type: "code_entry",     value: "KINDLE_VOL_CODE" }, /* Phase 4 */
    { target: "tier3_content",   type: "external_flag",  value: "GAME_CLEAR" }        /* Phase 6 */
  ],

  spoiler_tier_policy: { public_max: 1, kindle_max: 2, game_clear_max: 3 }
};
