/* 50by50 Resonance Walk — sprite.js
 * 泪／SHADEのスプライト描画。
 * v1.1＝Image2生成画4ポーズのアトラスを使用。読み込み失敗時は
 * 単色シルエットへ自動フォールバックする。600×900設計空間・
 * アンカー足元中央(0.5,1.0)は両方式で共通。
 * 成人男性体型（約7.5頭身）を維持し、デフォルメ・少年化はしない。 */
window.RW_SPRITE = (function () {
  const DESIGN_H = 900;             // 設計空間の高さ
  const VIOLET = "#7B6CE0";
  const GLASS  = "rgba(233,228,255,0.95)";

  /* ---- アトラス（公式絵差し替え）モード ---- */
  let atlasImg = null, atlasFrames = null, atlasReady = false;
  function initAtlas(cfg) {
    if (!cfg.use_atlas) return;
    atlasImg = new Image();
    atlasImg.onload = () => { atlasReady = !!atlasFrames; };
    atlasImg.src = cfg.atlas_img;
    const s = document.createElement("script");
    s.src = cfg.atlas_frames;
    s.onload = () => { atlasFrames = window.RW_ATLAS && window.RW_ATLAS.frames; atlasReady = !!(atlasFrames && atlasImg.complete); };
    document.head.appendChild(s);
  }
  function drawAtlas(ctx, p) {
    /* 左向きは右向き原画を反転し、別画像による顔・衣装差を防ぐ。 */
    const animMap = { idle: "idle", walk: "walk_r", inspect: "inspect", react: "react" };
    const cfg = window.RW_DATA.sprites.SPR_RUI_SET01;
    const key = animMap[p.anim];
    let name;
    if (p.anim === "walk" && (cfg.anims.walk_r || 1) < 2 && atlasFrames["rui_idle_00"]) {
      /* 歩行コマが1枚しか無い間の2コマ合成サイクル：
         接地（walk_r_00＝足が開く）⇄ 通過（idle_00＝足が揃う）を
         1サイクル2歩で交互表示し、足の入れ替わりとして見せる。
         接地はやや長く保持（0.30/0.20）。将来 anims.walk_r を2以上にして
         実コマを追加すれば、この合成は自動的に無効化される。 */
      const stepPh = p.phase % 0.5;
      name = stepPh < 0.30 ? "rui_walk_r_00" : "rui_idle_00";
    } else {
      const n = cfg.anims[key] || 1;
      const idx = Math.floor(p.phase * n) % n;
      name = "rui_" + key + "_" + String(idx).padStart(2, "0");
    }
    const f = atlasFrames[name];
    if (!f) return false;
    const s = p.h / DESIGN_H;
    let bob = 0, tilt = 0, recoil = 0;
    if (p.anim === "idle") {
      bob = Math.sin(p.t * 1.7) * p.h * 0.0022;
    } else if (p.anim === "walk") {
      /* 接地窓(〜0.30)中央で最下点、通過窓(0.30〜0.50)中央で最上点になるよう位相を同期 */
      const step = Math.sin((p.phase - 0.15) * Math.PI * 2);
      bob = Math.abs(step) * p.h * 0.008;
      tilt = Math.sin(p.phase * Math.PI * 2) * 0.004;
    } else if (p.anim === "inspect") {
      bob = Math.sin(p.t * 2.0) * p.h * 0.0012;
    } else if (p.anim === "react") {
      recoil = -p.facing * p.mix * p.h * 0.01;
    }
    ctx.save();
    ctx.translate(p.x + recoil, p.y - bob);
    ctx.rotate(tilt * p.facing);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, -f.w * s * 0.5, -f.h * s, f.w * s, f.h * s);
    ctx.restore();
    return true;
  }

  /* ---- シルエット描画 ----
     ローカル座標：原点=足元中央、上方向が -y。単位=設計px。 */
  function limb(ctx, x1, y1, cx, cy, x2, y2, w) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawSilhouette(ctx, p) {
    const s = p.h / DESIGN_H;
    const t = p.t;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(s * (p.facing < 0 ? -1 : 1), s);
    ctx.fillStyle = VIOLET;
    ctx.strokeStyle = VIOLET;
    ctx.globalAlpha = 0.92;

    /* --- ポーズパラメータ --- */
    let bob = 0, lean = 0, crouch = 0, armReach = 0;
    let legA = 0;                       // 脚スイング角
    if (p.anim === "idle") {
      bob = 3 * Math.sin(t * 1.6);
    } else if (p.anim === "walk") {
      legA = 0.52 * Math.sin(p.phase * Math.PI * 2);
      bob = 5 * Math.abs(Math.sin(p.phase * Math.PI * 2));
      lean = 0.04;
    } else if (p.anim === "inspect") {
      crouch = 150 * p.mix; lean = 0.30 * p.mix; armReach = p.mix;
      bob = 1.5 * Math.sin(t * 2);
    } else if (p.anim === "react") {
      lean = -0.05 * p.mix; bob = 1.5 * Math.sin(t * 2);
    }

    const hipY = -430 + crouch * 0.9;
    const shY  = -690 + crouch - bob;   // 肩
    const headY = -800 + crouch - bob;  // 頭中心

    /* --- 脚（奥→手前の順で描く） --- */
    const kneeBend = crouch * 0.9;
    // 奥脚
    limb(ctx, -16, hipY,
      -16 + 60 * Math.sin(-legA) + kneeBend * 0.4, (hipY + 0) / 2 + 20,
      -14 + 150 * Math.sin(-legA), -6 - kneeBend * 0.35, 40);
    // 手前脚
    ctx.globalAlpha = 0.96;
    limb(ctx, 16, hipY,
      16 + 60 * Math.sin(legA) + kneeBend * 0.4, (hipY + 0) / 2 + 20,
      18 + 150 * Math.sin(legA), -6 - kneeBend * 0.5, 44);

    /* --- 胴（フーディ：裾がわずかに広がる） --- */
    ctx.save();
    ctx.translate(0, shY);
    ctx.rotate(lean);
    ctx.beginPath();
    ctx.moveTo(-96, 4);                                  // 左肩
    ctx.quadraticCurveTo(-112, (hipY - shY) * 0.55, -84, hipY - shY + 26); // 左脇→左裾
    ctx.quadraticCurveTo(0, hipY - shY + 44, 84, hipY - shY + 26);         // 裾
    ctx.quadraticCurveTo(112, (hipY - shY) * 0.55, 96, 4);                 // 右脇→右肩
    ctx.quadraticCurveTo(60, -34, 0, -36);               // 首元
    ctx.quadraticCurveTo(-60, -34, -96, 4);
    ctx.fill();
    /* フード（首の後ろの膨らみ＝進行方向の逆側） */
    ctx.beginPath();
    ctx.ellipse(-62, -30, 46, 40, -0.4, 0, Math.PI * 2);
    ctx.fill();

    /* --- 腕 --- */
    const armSwing = p.anim === "walk" ? -legA * 0.7 : 0.05 * Math.sin(t * 1.6);
    // 奥腕
    ctx.globalAlpha = 0.85;
    limb(ctx, -78, 14, -96 + 40 * Math.sin(-armSwing), 130, -70 + 90 * Math.sin(-armSwing), 236, 30);
    // 手前腕（調査時は前方下へ伸ばす）
    ctx.globalAlpha = 0.96;
    if (armReach > 0.05) {
      limb(ctx, 78, 14, 128, 120 + 60 * armReach, 150 + 40 * armReach, 200 + 90 * armReach, 32);
    } else {
      limb(ctx, 78, 14, 96 + 40 * Math.sin(armSwing), 130, 70 + 90 * Math.sin(armSwing), 236, 32);
    }
    ctx.restore();

    /* --- 頭・髪 --- */
    ctx.globalAlpha = 0.96;
    ctx.save();
    ctx.translate(0, headY);
    ctx.rotate(lean * 0.7);
    ctx.beginPath();
    ctx.ellipse(6, 0, 52, 60, 0, 0, Math.PI * 2);        // 顔（進行方向へ僅かに前）
    ctx.fill();
    /* 無造作な短髪のタフト */
    const sway = 3 * Math.sin(t * 1.3 + 1);
    ctx.beginPath();
    ctx.moveTo(-52, 6);
    ctx.quadraticCurveTo(-70 + sway, -46, -34, -58);
    ctx.quadraticCurveTo(-26 + sway, -84, 4, -66);
    ctx.quadraticCurveTo(26 + sway, -92, 40, -58);
    ctx.quadraticCurveTo(66 + sway, -48, 56, -8);
    ctx.quadraticCurveTo(70, 18, 50, 34);                // もみあげ〜襟足
    ctx.quadraticCurveTo(30, 10, 6, 4);
    ctx.closePath();
    ctx.fill();
    /* 前髪 */
    ctx.beginPath();
    ctx.moveTo(56, -12);
    ctx.quadraticCurveTo(46, 12, 30, 4);
    ctx.quadraticCurveTo(40, -20, 24, -18);
    ctx.quadraticCurveTo(30, -36, 56, -30);
    ctx.fill();

    /* --- グラスの細い発光線（アイデンティティ） --- */
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
    ctx.strokeStyle = GLASS;
    ctx.globalAlpha = (p.anim === "react" ? 0.95 : 0.8) * pulse;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(58, -8);
    ctx.stroke();
    /* テンプル（つる）の点 */
    ctx.globalAlpha = 0.5 * pulse;
    ctx.beginPath();
    ctx.moveTo(-30, -2); ctx.lineTo(8, -6);
    ctx.lineWidth = 2.4; ctx.stroke();
    /* ピアス */
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = GLASS;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-32, 26); ctx.lineTo(-32, 44); ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function draw(ctx, p) {
    if (atlasReady && drawAtlas(ctx, p)) return;
    drawSilhouette(ctx, p);
  }

  return { draw, initAtlas };
})();
