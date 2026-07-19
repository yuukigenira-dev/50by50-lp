/* 50by50 Resonance Walk — ui.js
 * 画面遷移・オーバーレイ・ログカード・マップ描画・入力の配線。 */
window.RW_UI = (function () {
  const D = window.RW_DATA;
  const E = window.RW_ENGINE;
  const AU = window.RW_AUDIO;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const LOCK_TEXT = "この記録は、白く伏せられています。";
  const el = {};
  const publicLogs = () => D.logs.filter(l => l.spoiler_tier <= D.spoiler_tier_policy.public_max);
  const collectedCount = () => publicLogs().filter(l => E.getSave().logs.includes(l.log_id)).length;
  function updateRec() {
    if (el.hudRec) el.hudRec.textContent = "REC " + collectedCount() + "/" + publicLogs().length;
  }

  function init() {
    Object.assign(el, {
      title: $("#scr-title"), explore: $("#scr-explore"),
      titleBg: $("#title-bg"),
      stage: $("#stage"), layerBg: $("#layer-bg"), layerMid: $("#layer-mid"),
      fade: $("#fade"), wisteria: $("#wisteria"), phaseNote: $("#phase-note"),
      locName: $("#loc-name"), hudObs: $("#hud-obs"), hudSig: $("#hud-sig"), hudRec: $("#hud-rec"),
      btnInspect: $("#btn-inspect"),
      logCard: $("#log-card"), lcTitle: $("#lc-title"), lcLabel: $("#lc-label"), lcBody: $("#lc-body")
    });

    el.titleBg.style.backgroundImage = "url(assets/bg/title_city_v.jpg)";

    E.init({
      stage: el.stage, layerBg: el.layerBg, layerMid: el.layerMid,
      fade: el.fade, wisteria: el.wisteria, phaseNote: el.phaseNote
    });

    /* ---- エンジンコールバック ---- */
    E.on("onLocation", loc => {
      el.locName.textContent = loc.name;
      const bars = el.hudSig.querySelectorAll("i");
      const n = 2 + Math.floor(Math.random() * 3);
      bars.forEach((b, i) => b.classList.toggle("on", i < n));
      updateRec();
    });
    E.on("onNear", it => {
      el.btnInspect.classList.toggle("ready", !!it);
      if (it && it.type === "echo") glitchHUD();
    });
    E.on("onLog", (log, isNew) => { showLogCard(log); updateRec(); });
    E.on("onMapUpdate", () => toastHUD("MAP UPDATED"));
    E.on("onBlocked", dest => {
      const n = dest && dest.unlocked_by
        ? dest.unlocked_by.value.filter(id => !E.getSave().logs.includes(id)).length : 0;
      toastHUD(n ? "未解放の記録領域（記録あと" + n + "件）" : "未解放の記録領域");
    });

    /* ---- タイトル ---- */
    $("#btn-start").addEventListener("click", () => {
      AU.unlock();
      switchScreen("explore");
      E.start();
      if (!E.getSave().guideSeen) openOverlay("ov-guide");
    });
    const markGuideSeen = () => {
      const sv = E.getSave();
      if (!sv.guideSeen) { sv.guideSeen = true; E.persist(); }
    };
    $("#btn-guide-start").addEventListener("click", () => {
      markGuideSeen(); AU.unlock(); closeOverlays();
      if (!el.explore.classList.contains("active")) { switchScreen("explore"); E.start(); }
    });
    $("#ov-guide [data-close]").addEventListener("click", markGuideSeen);
    $("#btn-guide-open").addEventListener("click", () => openOverlay("ov-guide"));
    $$("[data-open]").forEach(b =>
      b.addEventListener("click", () => { AU.unlock(); openOverlay(b.dataset.open); }));

    /* ---- 探索HUD ---- */
    $("#btn-title").addEventListener("click", () => { E.stop(); switchScreen("title"); });
    $("#btn-map").addEventListener("click", () => openOverlay("ov-map"));
    $("#btn-logbook").addEventListener("click", () => openOverlay("ov-logbook"));
    el.btnInspect.addEventListener("click", () => E.interactNear());
    $("#lc-close").addEventListener("click", hideLogCard);

    /* ---- 移動ボタン（押している間だけ） ---- */
    bindHold($("#btn-left"), -1);
    bindHold($("#btn-right"), 1);

    /* ---- ステージタップ移動 ---- */
    el.stage.addEventListener("pointerdown", ev => {
      AU.unlock();
      if (el.logCard.classList.contains("on")) { hideLogCard(); return; }
      E.tapWorld(ev.clientX - el.stage.getBoundingClientRect().left);
    });

    /* ---- PCキー操作 ---- */
    const keys = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
    window.addEventListener("keydown", ev => {
      if (!el.explore.classList.contains("active")) return;
      if (ev.key === "Escape") { closeOverlays(); return; }
      if (document.querySelector(".overlay.active")) return;
      if (ev.key in keys) { E.setDir(keys[ev.key]); ev.preventDefault(); }
      if (ev.key === "e" || ev.key === "E") E.interactNear();
    });
    window.addEventListener("keyup", ev => { if (ev.key in keys) E.setDir(0); });

    /* ---- オーバーレイ共通 ---- */
    $$("[data-close]").forEach(b =>
      b.addEventListener("click", closeOverlays));

    /* ---- 設定 ---- */
    const tgl = $("#tgl-se");
    tgl.classList.toggle("on", E.getSave().se);
    tgl.addEventListener("click", () => {
      const v = !tgl.classList.contains("on");
      tgl.classList.toggle("on", v);
      E.setSE(v);
    });
    const tglB = $("#tgl-bgm");
    tglB.classList.toggle("on", E.getSave().bgm !== false);
    tglB.addEventListener("click", () => {
      const v = !tglB.classList.contains("on");
      tglB.classList.toggle("on", v);
      E.setBGM(v);
    });
    /* タイトルBGM: 最初のジェスチャで開始（自動再生制限対応） */
    el.title.addEventListener("pointerdown", () => {
      if (!el.title.classList.contains("active")) return;
      AU.unlock();
      const t = D.screens_bgm && D.screens_bgm.title;
      if (t) AU.playBgm("screen_title", t.src, t.gain);
    }, { once: true });
    $("#btn-reset").addEventListener("click", () => {
      if (confirm("観測記録（取得ログ・解放状態）を初期化します。よろしいですか？")) {
        E.resetSave(); renderLogbook(); updateRec(); toastHUD("RESET");
      }
    });

    /* ---- 導線 ---- */
    renderLinks();

    /* ---- HUD時計 ---- */
    setInterval(() => {
      const d = new Date();
      el.hudObs.textContent = "OBS.07 / " +
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }, 1000);
  }

  function bindHold(btn, dir) {
    const down = ev => { ev.preventDefault(); AU.unlock(); E.setDir(dir); };
    const up = () => E.setDir(0);
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("pointercancel", up);
  }

  function switchScreen(name) {
    el.title.classList.toggle("active", name === "title");
    el.explore.classList.toggle("active", name === "explore");
  }

  /* ---------- オーバーレイ ---------- */
  function openOverlay(id) {
    closeOverlays();
    $("#" + id).classList.add("active");   /* 先に表示してから採寸・描画する */
    if (id === "ov-map") renderMap();
    if (id === "ov-logbook") renderLogbook();
  }
  function closeOverlays() {
    const wasComplete = $("#ov-complete").classList.contains("active");
    $$(".overlay").forEach(o => o.classList.remove("active"));
    if (wasComplete) E.refreshBgm();   /* 主題歌 → 地点BGMへ復帰 */
  }

  /* ---------- ログカード ---------- */
  function showLogCard(log) {
    el.lcTitle.textContent = log.title;
    el.lcLabel.textContent = "【" + log.label + "】";
    el.lcBody.textContent = log.body;
    el.logCard.classList.add("on");
  }
  function hideLogCard() {
    el.logCard.classList.remove("on");
    const sv = E.getSave();
    if (collectedCount() === publicLogs().length && !sv.completeDone) {
      sv.completeDone = true; E.persist();
      renderCompleteLinks();
      setTimeout(() => {
        openOverlay("ov-complete");
        const t = D.screens_bgm && D.screens_bgm.complete;
        if (t) AU.playBgm("screen_complete", t.src, t.gain);   /* 主題歌「50by50」 */
      }, 450);
    }
  }
  function renderCompleteLinks() {
    const box = $("#complete-links");
    box.innerHTML = D.links.map(l => l.href
      ? `<a class="link-btn" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}<span class="arrow">→</span></a>`
      : `<span class="link-btn disabled">${esc(l.label)}<span class="arrow">──</span></span>`
    ).join("");
  }

  /* ---------- ログ帳 ---------- */
  function renderLogbook() {
    const save = E.getSave();
    const list = $("#lb-list");
    const pol = D.spoiler_tier_policy.public_max;
    let html = "";
    let shown = 0, total = 0;
    for (const log of D.logs) {
      if (log.spoiler_tier > pol) {
        /* ネタバレロック：白い上書き風 */
        html += `<div class="lb-item sealed">
          <div class="h"><span class="t">${esc(log.title)}</span><span class="l">──</span></div>
          <div class="b">${LOCK_TEXT}</div>
          <div class="ghost">████ █████████ ████████\n██████ ████ ███████</div>
        </div>`;
        continue;
      }
      total++;
      if (save.logs.includes(log.log_id)) {
        shown++;
        html += `<div class="lb-item">
          <div class="h"><span class="t">${esc(log.title)}</span><span class="l">【${esc(log.label)}】</span></div>
          <div class="b">${esc(log.body)}</div>
        </div>`;
      } else {
        html += `<div class="lb-item empty">
          <div class="h"><span class="t">──</span><span class="l"></span></div>
          <div class="b">未取得の記録</div>
        </div>`;
      }
    }
    $("#lb-count").textContent = `RECORDS ${shown} / ${total}` + (shown === total ? " ── COMPLETE" : "");
    list.innerHTML = html;
  }

  /* ---------- マップ（星図風） ---------- */
  function renderMap() {
    const svg = $("#map-svg");
    const appEl = document.getElementById("app");
    const W = svg.clientWidth || (appEl ? appEl.clientWidth : window.innerWidth);
    const H = svg.clientHeight || (appEl ? appEl.clientHeight - 60 : window.innerHeight - 60);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const cur = E.current();
    /* 寸法スケール（基準を強め、上限も拡大） */
    const k = Math.max(1, Math.min(2.6, Math.min(W / 340, H / 620)));
    /* ノード座標を余白付きで面いっぱいに再配置（星座の相対形は保持） */
    const ps = Object.values(D.map_nodes);
    const minX = Math.min(...ps.map(p => p.x)), maxX = Math.max(...ps.map(p => p.x));
    const minY = Math.min(...ps.map(p => p.y)), maxY = Math.max(...ps.map(p => p.y));
    const nx = p => (0.12 + (p.x - minX) / Math.max(0.001, maxX - minX) * 0.76) * W;
    const ny = p => (0.15 + (p.y - minY) / Math.max(0.001, maxY - minY) * 0.62) * H;
    const fs = 12 * k;
    /* ラベルが画面端で切れないようにX位置をクランプ */
    const labelX = (x, textLen) => {
      const half = textLen * fs * 0.56;
      return Math.max(half + 8, Math.min(W - half - 8, x));
    };
    let s = "";

    /* 星屑 */
    for (let i = 0; i < 40; i++) {
      const x = ((i * 79) % 100) / 100 * W, y = ((i * 53) % 100) / 100 * H;
      s += `<circle cx="${x}" cy="${y}" r="${((i % 3) * 0.4 + 0.5) * k}" fill="rgba(201,184,232,.45)"/>`;
    }
    /* 細線ネットワーク */
    for (const [a, b] of D.map_edges) {
      const pa = D.map_nodes[a], pb = D.map_nodes[b];
      s += `<line x1="${nx(pa)}" y1="${ny(pa)}" x2="${nx(pb)}" y2="${ny(pb)}"
            stroke="rgba(123,108,224,.35)" stroke-width="${k}" stroke-dasharray="${1.2 * k} ${5 * k}"/>`;
    }
    /* ノード */
    for (const loc of D.locations) {
      const p = D.map_nodes[loc.location_id];
      if (!p) continue;
      const x = nx(p), y = ny(p);
      const unlocked = E.isUnlocked(loc);
      const here = cur && cur.location_id === loc.location_id;
      if (!unlocked) {
        /* 未開放＝白い靄 */
        s += `<g class="mnode" data-loc="${loc.location_id}" data-locked="1" style="cursor:pointer">
          <circle cx="${x}" cy="${y}" r="${26 * k}" fill="rgba(247,247,250,.9)" filter="url(#haze)"/>
          <circle cx="${x}" cy="${y}" r="${4.5 * k}" fill="rgba(201,184,232,.5)"/>
          <text x="${x}" y="${y + 46 * k}" text-anchor="middle" font-size="${11 * k}"
                fill="rgba(27,33,64,.35)" letter-spacing="${2 * k}">──</text></g>`;
      } else {
        s += `<g class="mnode" data-loc="${loc.location_id}" style="cursor:pointer">
          <circle cx="${x}" cy="${y}" r="${13 * k}" fill="none" stroke="rgba(123,108,224,.55)" stroke-width="${k}"/>
          <circle cx="${x}" cy="${y}" r="${4.5 * k}" fill="${here ? "#7B6CE0" : "rgba(27,33,64,.55)"}">
            ${here ? `<animate attributeName="r" values="${4 * k};${6.5 * k};${4 * k}" dur="1.6s" repeatCount="indefinite"/>` : ""}
          </circle>
          <text x="${labelX(x, loc.name.length + 2)}" y="${y + 36 * k}" text-anchor="middle" font-size="${fs}"
                fill="rgba(27,33,64,.78)" letter-spacing="1.5">${esc(loc.name)}${logMark(loc, k)}</text></g>`;
      }
    }
    svg.innerHTML =
      `<defs><filter id="haze" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="${9 * k}"/></filter></defs>` + s;

    $$("#map-svg .mnode").forEach(n => {
      n.addEventListener("click", () => {
        const id = n.dataset.loc;
        if (n.dataset.locked) {
          AU.se.deny();
          const loc = E.locById(id);
          const miss = loc && loc.unlocked_by
            ? loc.unlocked_by.value.filter(v => !E.getSave().logs.includes(v)).length : 0;
          mapNote(miss ? "観測記録が不足しています（あと" + miss + "件）" : "観測記録が不足しています");
          return;
        }
        closeOverlays();
        if (!el.explore.classList.contains("active")) { switchScreen("explore"); E.start(); }
        if (!E.current() || E.current().location_id !== id) E.goTo(id, null);
      });
    });
  }
  function logMark(loc, k) {
    const it = D.interactables.find(i => i.location === loc.location_id && i.type === "log");
    if (!it) return "";
    const got = E.getSave().logs.includes(it.log_id);
    return `<tspan dx="${6 * (k || 1)}" fill="${got ? "#7B6CE0" : "rgba(27,33,64,.4)"}">${got ? "●" : "○"}</tspan>`;
  }
  let noteT = 0;
  function mapNote(txt) {
    const n = $("#map-note");
    n.textContent = txt; n.classList.add("on");
    clearTimeout(noteT);
    noteT = setTimeout(() => n.classList.remove("on"), 1800);
  }

  /* ---------- 導線 ---------- */
  function renderLinks() {
    const box = $("#links-list");
    box.innerHTML = D.links.map(l => l.href
      ? `<a class="link-btn" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)}<span class="arrow">→</span></a>`
      : `<span class="link-btn disabled">${esc(l.label)}<span class="arrow">──</span></span>`
    ).join("");
  }

  /* ---------- HUD小演出 ---------- */
  let glitchT = 0;
  function glitchHUD() {
    const t = performance.now();
    if (t - glitchT < 4000) return;
    glitchT = t;
    const orig = el.hudObs.textContent;
    el.hudObs.textContent = "【照合不能】";
    el.hudObs.style.color = "#7B6CE0";
    setTimeout(() => { el.hudObs.style.color = ""; }, 700);
  }
  let toastT = 0;
  function toastHUD(txt) {
    el.phaseNote.textContent = txt;
    el.phaseNote.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      el.phaseNote.classList.remove("on");
      setTimeout(() => { el.phaseNote.textContent = "位相ノイズを検出"; }, 700);
    }, 1600);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  return { init };
})();
