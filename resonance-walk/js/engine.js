/* 50by50 Resonance Walk — engine.js
 * 探索ループ：移動（タップ／ボタン／キー）・カメラ・調査・画面端遷移・保存。 */
window.RW_ENGINE = (function () {
  const D = window.RW_DATA;
  const FX = window.RW_FX;
  const AU = window.RW_AUDIO;

  /* ---------- 保存（localStorage不可環境ではメモリ保持） ---------- */
  const SAVE_KEY = "rw_save_v1";
  let save = { logs: [], se: true, bgm: true };
  function loadSave() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (s) save = Object.assign(save, JSON.parse(s));
    } catch (e) {}
    AU.setEnabled(save.se);
    AU.setBgmEnabled(save.bgm !== false);
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function resetSave() {
    save = { logs: [], se: save.se };
    persist();
    /* 初期化後に解放条件を失った地点へ居残らない。 */
    if (running && cur && !isUnlocked(cur)) loadLocation(D.player.start_location, null);
    if (cbs.onMapUpdate) cbs.onMapUpdate();
  }

  /* ---------- 参照ヘルパ ---------- */
  const locById = id => D.locations.find(l => l.location_id === id);
  const logById = id => D.logs.find(l => l.log_id === id);
  const itsOf = id => D.interactables.filter(i => i.location === id);
  function isUnlocked(loc) {
    if (!loc.unlocked_by) return true;
    if (loc.unlocked_by.type === "logs_collected")
      return loc.unlocked_by.value.every(v => save.logs.includes(v));
    return false; /* code_entry / external_flag は将来Phase */
  }
  function tierVisible(tier) { return tier <= D.spoiler_tier_policy.public_max; }

  /* ---------- 実行状態 ---------- */
  const el = {};
  let running = false, lastT = 0, raf = 0;
  let vw = 0, vh = 0, groundY = 0, worldW = 0, dpr = 1;
  let cur = null;                 // 現在地点
  const player = {
    wx: 0, facing: 1, anim: "idle", t: 0, phase: 0, mix: 0,
    target: null, dir: 0, busy: false, recoil: null
  };
  let cam = 0;
  let nearIt = null, lastDenyT = 0, midnightDone = false, stepAcc = 0;
  const cbs = { onNear: null, onLog: null, onLocation: null, onMapUpdate: null, onBlocked: null };

  /* ---------- 初期化 ---------- */
  function init(refs) {
    Object.assign(el, refs);
    loadSave();
    RW_SPRITE.initAtlas(D.sprites[D.player.sprite_set]);
    window.addEventListener("resize", () => { if (cur) layout(true); });
  }

  function layout(rebuild) {
    const box = el.stage.parentElement;   /* #world＝アプリ枠内のステージ */
    vw = box.clientWidth || window.innerWidth;
    vh = box.clientHeight || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    el.stage.width = vw * dpr; el.stage.height = vh * dpr;
    el.stage.style.width = vw + "px"; el.stage.style.height = vh + "px";
    groundY = vh * 0.80;
    worldW = Math.max(cur.world_w * vw, vw * 1.4);
    if (rebuild) buildLayers();
    clampAll();
  }

  function buildLayers() {
    const bgW = vw + (worldW - vw) * 0.25;
    el.layerBg.style.width = bgW + "px";
    const b = cur.bg;
    if (b.type === "image") {
      el.layerBg.style.backgroundImage = `url(${b.src})`;
      el.layerBg.style.backgroundPosition = b.position || "center bottom";
      el.layerBg.style.backgroundColor = "";
    } else {
      el.layerBg.style.backgroundImage = "";
      el.layerBg.style.background =
        `linear-gradient(180deg, ${b.grad[0]} 0%, ${b.grad[1]} 55%, ${b.grad[2]} 100%)`;
    }
    /* 白ウォッシュ（トーン統一） */
    el.layerBg.querySelector(".wash").style.opacity = (b.wash != null ? b.wash : 0);
    /* 時間帯ティント */
    const tint = el.layerBg.querySelector(".tint");
    const hr = new Date().getHours();
    const isNight = cur.time === "night" || (cur.time === "auto" && (hr >= 18 || hr < 5));
    if (cur.time === "auto" && isNight) {
      tint.style.background =
        "linear-gradient(180deg, rgba(27,33,64,.30), rgba(27,33,64,.16))," +
        "radial-gradient(circle at 22% 42%, rgba(183,159,224,.20), transparent 34%)," +
        "radial-gradient(circle at 76% 38%, rgba(123,108,224,.16), transparent 30%)";
    } else if (cur.time === "rain") {
      tint.style.background = "linear-gradient(180deg, rgba(90,100,120,.14), rgba(120,130,150,.10))";
    } else {
      tint.style.background = "none";
    }
    /* 遠景・近景の装飾 */
    let far = el.layerBg.querySelector(".far");
    if (!far) { far = document.createElement("div"); far.className = "far";
      far.style.cssText = "position:absolute;inset:0;pointer-events:none"; el.layerBg.appendChild(far); }
    far.innerHTML = FX.decoFar(cur, bgW, vh);
    el.layerMid.style.width = worldW + "px";
    el.layerMid.innerHTML = FX.decoMid(cur, worldW, vh, groundY);
  }

  /* ---------- 地点ロード ---------- */
  function loadLocation(id, enterEdge) {
    cur = locById(id);
    FX.clear();
    layout(true);
    player.busy = false; player.recoil = null; player.target = null; player.dir = 0; player.anim = "idle"; player.mix = 0;
    player.wx = enterEdge === "left" ? vw * 0.12
             : enterEdge === "right" ? worldW - vw * 0.12
             : worldW * 0.30;
    player.facing = enterEdge === "right" ? -1 : 1;
    cam = clamp(player.wx - vw * 0.5, 0, worldW - vw);
    FX.setRain(!!cur.rain);
    FX.setAmbient(cur.bg.deco === "plaza" ? "motes" : null);
    AU.startAmbient(cur.ambient, !!(cur.bgm && cur.bgm.src));
    AU.playBgm(cur.location_id, cur.bgm && cur.bgm.src, cur.bgm && cur.bgm.gain);
    if (cbs.onLocation) cbs.onLocation(cur);
    maybeMidnightHook();
    applyParallax();
  }

  function maybeMidnightHook() {
    if (midnightDone) return;
    const h = new Date().getHours();
    if (h >= 23 || h < 4) {
      midnightDone = true;
      setTimeout(() => {
        el.wisteria.classList.add("on");
        el.phaseNote.classList.add("on");
        AU.duckAmbient(0.6);
        setTimeout(() => el.wisteria.classList.remove("on"), 500);
        setTimeout(() => el.phaseNote.classList.remove("on"), 2600);
      }, 900);
    }
  }

  /* ---------- 入力 ---------- */
  function setDir(d) { if (!player.busy) { player.dir = d; if (d) { player.target = null; player.facing = d; } } }
  function tapWorld(sx) {
    if (player.busy) return;
    const wx = sx + cam;
    /* 調査ポイント近傍タップなら、そこへ寄って調査 */
    const it = hitInteractable(wx);
    if (it && Math.abs(it._wx - player.wx) < vw * 0.9) {
      walkThenInteract(it);
      return;
    }
    player.target = clamp(wx, edgeMin(), edgeMax());
    player.facing = player.target > player.wx ? 1 : -1;
  }
  function hitInteractable(wx) {
    let best = null, bd = vh * 0.075;
    for (const it of itsOf(cur.location_id)) {
      it._wx = it.x * worldW;
      const d = Math.abs(it._wx - wx);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function edgeMin() { return vw * 0.03; }
  function edgeMax() {
    return cur.edge_guard === "right" ? worldW * 0.90 : worldW - vw * 0.03;
  }

  function walkThenInteract(it) {
    const stand = it._wx - (it._wx > player.wx ? 1 : -1) * vh * 0.05;
    if (Math.abs(player.wx - stand) < 12) { interact(it); return; }
    player.target = clamp(stand, edgeMin(), edgeMax());
    player.facing = player.target > player.wx ? 1 : -1;
    player._pending = it;
  }

  function interactNear() { if (nearIt && !player.busy) walkThenInteract(nearIt); }

  /* ---------- 調査 ---------- */
  function interact(it) {
    if (player.busy) return;
    player.busy = true; player.target = null; player.dir = 0;
    player.facing = it._wx >= player.wx ? 1 : -1;
    player.anim = it.anim === "react" ? "react" : "inspect";
    player.mix = 0; player.t = 0;
    const peak = 700, total = 1500;
    setTimeout(() => {
      const gy = groundY;
      if (it.type === "log") {
        const log = logById(it.log_id);
        if (log && tierVisible(log.spoiler_tier)) {
          AU.se.log();
          const isNew = !save.logs.includes(log.log_id);
          if (isNew) { save.logs.push(log.log_id); persist(); }
          if (cbs.onLog) cbs.onLog(log, isNew);
          if (isNew && cbs.onMapUpdate &&
              D.locations.some(l => l.unlocked_by && isUnlocked(l) &&
                l.unlocked_by.value.includes(log.log_id))) cbs.onMapUpdate();
        }
      } else if (it.type === "echo") {
        FX.trigger(it.echo_fx, it._wx, gy, vh);
        AU.duckAmbient(0.5);
        ({ fx_gather: AU.se.strings, fx_outline: AU.se.echo, fx_breath: AU.se.breath,
           fx_mismatch: AU.se.deny, fx_sit: AU.se.echo }[it.echo_fx] || AU.se.echo)();
        if (cur.location_id === "loc_rain_roof") setTimeout(AU.se.dropTick, 1400);
      }
    }, peak);
    setTimeout(() => { player.busy = false; player.anim = "idle"; }, total);
  }

  /* ---------- 遷移 ---------- */
  let transitioning = false;
  function tryEdgeTransition(edge) {
    if (transitioning) return false;
    const con = D.connections.find(c => c.from === cur.location_id && c.edge === edge);
    if (!con) return false;
    const dest = locById(con.to);
    if (!isUnlocked(dest)) {
      const t = performance.now();
      if (t - lastDenyT > 2500) {
        lastDenyT = t; AU.se.deny();
        if (cbs.onBlocked) cbs.onBlocked(dest);
      }
      return false;
    }
    goTo(dest.location_id, edge === "right" ? "left" : "right");
    return true;
  }
  function goTo(id, enterEdge) {
    transitioning = true;
    player.dir = 0; player.target = null;
    el.fade.classList.add("on");
    setTimeout(() => {
      loadLocation(id, enterEdge || null);
      setTimeout(() => { el.fade.classList.remove("on"); transitioning = false; }, 80);
    }, 320);
  }

  /* ---------- ループ ---------- */
  function start() {
    if (!cur || !isUnlocked(cur)) loadLocation(D.player.start_location, null);
    running = true; lastT = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); AU.stopAmbient(); }

  function tick(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    step(dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function step(dt) {
    player.t += dt;
    /* 屋上端の半歩後退。react画像を出したまま滑らかに安全側へ戻す。 */
    if (player.recoil) {
      const r = player.recoil;
      r.elapsed += dt;
      const u = Math.min(1, r.elapsed / r.duration);
      const eased = 1 - Math.pow(1 - u, 3);
      player.wx = r.from + (r.to - r.from) * eased;
      if (u >= 1) {
        player.recoil = null;
        player.busy = false;
        player.anim = "idle";
        player.mix = 0;
      }
    /* 通常移動 */
    } else if (!player.busy) {
      let vx = 0;
      if (player.dir) vx = player.dir * D.player.speed;
      else if (player.target != null) {
        const d = player.target - player.wx;
        if (Math.abs(d) < 3) {
          player.wx = player.target; player.target = null;
          if (player._pending) { const it = player._pending; player._pending = null; interact(it); }
        } else vx = Math.sign(d) * D.player.speed;
      }
      if (vx !== 0) {
        player.wx += vx * dt;
        player.anim = "walk";
        player.phase = (player.phase + Math.abs(vx) * dt / 150) % 1;
        stepAcc += Math.abs(vx) * dt;
        if (stepAcc > 75) { stepAcc = 0; AU.se.step(cur.location_id === "loc_corridor"); }
      } else if (player.anim === "walk") {
        player.anim = "idle"; player.phase = 0;
      }
      /* 縁の安全挙動：泪が自分で半歩引く */
      if (cur.edge_guard === "right" && player.wx > worldW * 0.90) {
        const edge = worldW * 0.90;
        player.wx = edge;
        player.target = null;
        player.dir = 0;
        player.anim = "react"; player.mix = 1;
        player.busy = true;
        player.recoil = {
          from: edge,
          to: Math.max(edgeMin(), edge - vh * 0.05),
          elapsed: 0,
          duration: 0.58
        };
      }
      /* 画面端遷移 */
      if (player.wx <= edgeMin() + 1) { if (!tryEdgeTransition("left")) player.wx = edgeMin() + 1; }
      if (player.wx >= worldW - vw * 0.03 - 1 && !cur.edge_guard) {
        if (!tryEdgeTransition("right")) player.wx = worldW - vw * 0.03 - 1;
      }
    }
    /* 調査ミックス */
    const target = (player.anim === "inspect" || player.anim === "react") ? 1 : 0;
    player.mix += (target - player.mix) * Math.min(1, dt * 6);

    /* 近接判定 */
    const before = nearIt;
    nearIt = null;
    for (const it of itsOf(cur.location_id)) {
      it._wx = it.x * worldW;
      if (Math.abs(it._wx - player.wx) < vh * 0.14) { nearIt = it; break; }
    }
    if (nearIt !== before) {
      if (nearIt) AU.se.hud();
      if (cbs.onNear) cbs.onNear(nearIt);
    }

    /* カメラ */
    cam += (clamp(player.wx - vw * 0.5, 0, Math.max(0, worldW - vw)) - cam) * Math.min(1, dt * 4.5);
    applyParallax();

    FX.update(dt, { vw, vh, camX: cam, groundY });
  }

  function applyParallax() {
    el.layerBg.style.transform = `translate3d(${-cam * 0.25}px,0,0)`;
    el.layerMid.style.transform = `translate3d(${-cam}px,0,0)`;
  }

  function render() {
    const ctx = el.stage.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    /* 調査ポイントのマーカー
       消音環境でも気づけるよう、動き（波紋・浮遊）と明暗両背景での視認性
       （白芯＋青紫の二重表現）を持たせる。発光はすべて微光の範囲に留める。 */
    const tnow = performance.now() / 1000;
    const rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* 画面高さ基準のスケール（375×812のスマホ基準寸法を大画面へ拡大） */
    const mk = Math.max(1, Math.min(2.0, vh / 812));
    for (const it of itsOf(cur.location_id)) {
      const x = it.x * worldW - cam;
      if (x < -80 * mk || x > vw + 80 * mk) continue;
      const near = nearIt && nearIt.id === it.id;
      const done = it.type === "log" && save.logs.includes(it.log_id);
      const seed = it.x * 9;

      if (done) {
        /* 回収済み：静的だが場所が分かる痕跡（白芯＋淡藤の二重リングと中心点） */
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,.6)";
        ctx.beginPath();
        ctx.ellipse(x, groundY, 13 * mk, 4.3 * mk, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(201,184,232,.55)";
        ctx.beginPath();
        ctx.ellipse(x, groundY, 18 * mk, 6 * mk, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(201,184,232,.6)";
        ctx.beginPath();
        ctx.arc(x, groundY, 2 * mk, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      /* 底部の淡いグロー */
      const glow = ctx.createRadialGradient(x, groundY, 0, x, groundY, vh * 0.06);
      glow.addColorStop(0, "rgba(123,108,224,.28)");
      glow.addColorStop(0.6, "rgba(123,108,224,.11)");
      glow.addColorStop(1, "rgba(123,108,224,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - vh * 0.065, groundY - vh * 0.033, vh * 0.13, vh * 0.066);

      /* 微光の柱 */
      const beamH = vh * 0.17;
      const beam = ctx.createLinearGradient(0, groundY - beamH, 0, groundY);
      beam.addColorStop(0, "rgba(233,228,255,0)");
      beam.addColorStop(1, near ? "rgba(233,228,255,.26)" : "rgba(233,228,255,.18)");
      ctx.fillStyle = beam;
      ctx.fillRect(x - 12 * mk, groundY - beamH, 24 * mk, beamH);

      /* 波紋（外へ広がる楕円2本） */
      if (!rm) {
        for (let k = 0; k < 2; k++) {
          const ph = ((tnow * 0.42 + k * 0.5 + seed) % 1);
          const rx = (15 + ph * 36) * mk;
          const a = (1 - ph) * (near ? 0.7 : 0.55);
          ctx.strokeStyle = k === 0
            ? `rgba(123,108,224,${a.toFixed(3)})`
            : `rgba(255,255,255,${(a * 0.9).toFixed(3)})`;
          ctx.lineWidth = Math.max(1, 1.2 * mk);
          ctx.beginPath();
          ctx.ellipse(x, groundY, rx, rx * 0.32, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      /* 中心の二重リング（白芯＋青紫） */
      ctx.lineWidth = Math.max(1, 1.2 * mk);
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.beginPath();
      ctx.ellipse(x, groundY, 14 * mk, 4.6 * mk, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = near ? "rgba(123,108,224,.95)" : "rgba(123,108,224,.85)";
      ctx.beginPath();
      ctx.ellipse(x, groundY, 19 * mk, 6.3 * mk, 0, 0, Math.PI * 2);
      ctx.stroke();

      /* 浮遊マーカー（ダイヤ）とヘアライン */
      const by = groundY - vh * 0.20 + (rm ? 0 : Math.sin(tnow * 2 + seed) * 3.5 * mk);
      ctx.strokeStyle = "rgba(123,108,224,.45)";
      ctx.lineWidth = Math.max(1, 1 * mk);
      ctx.beginPath();
      ctx.moveTo(x, by + 9 * mk);
      ctx.lineTo(x, groundY - 9 * mk);
      ctx.stroke();
      const dz = (near ? 8 : 6.5) * mk;
      ctx.beginPath();
      ctx.moveTo(x, by - dz); ctx.lineTo(x + dz, by);
      ctx.lineTo(x, by + dz); ctx.lineTo(x - dz, by);
      ctx.closePath();
      ctx.fillStyle = near ? "rgba(123,108,224,.98)" : "rgba(123,108,224,.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.95)";
      ctx.lineWidth = Math.max(1, 1.2 * mk);
      ctx.stroke();
      if (near) {
        const pu = rm ? 0.5 : 0.5 + 0.5 * Math.sin(tnow * 3);
        ctx.strokeStyle = `rgba(123,108,224,${(0.4 + 0.35 * pu).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, by, dz + 5 * mk, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    FX.drawCanvas(ctx, { camX: cam, vw, vh, groundY });

    /* 泪 */
    RW_SPRITE.draw(ctx, {
      x: player.wx - cam, y: groundY + 2,
      h: vh * 0.32,
      facing: player.facing,
      anim: player.anim, t: player.t, phase: player.phase, mix: player.mix
    });
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function clampAll() {
    if (!cur) return;
    player.wx = clamp(player.wx, edgeMin(), worldW - vw * 0.02);
    cam = clamp(cam, 0, Math.max(0, worldW - vw));
  }

  /* ---------- 公開API ---------- */
  return {
    init, start, stop, loadLocation, goTo,
    setDir, tapWorld, interactNear,
    on: (k, fn) => { cbs[k] = fn; },
    getSave: () => save, persist, resetSave,
    isUnlocked, tierVisible, locById, logById,
    setSE: v => { save.se = v; persist(); AU.setEnabled(v);
      if (v && cur) AU.startAmbient(cur.ambient, !!(cur.bgm && cur.bgm.src)); },
    setBGM: v => { save.bgm = v; persist(); AU.setBgmEnabled(v);
      if (v && cur) AU.playBgm(cur.location_id, cur.bgm && cur.bgm.src, cur.bgm && cur.bgm.gain);
      if (cur) AU.startAmbient(cur.ambient, v && !!(cur.bgm && cur.bgm.src)); },
    refreshBgm: () => { if (cur) AU.playBgm(cur.location_id, cur.bgm && cur.bgm.src, cur.bgm && cur.bgm.gain); },
    current: () => cur,
    hasNear: () => !!nearIt
  };
})();
