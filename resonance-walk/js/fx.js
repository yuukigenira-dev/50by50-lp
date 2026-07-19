/* 50by50 Resonance Walk — fx.js
 * 地点装飾（SVG生成プレースホルダー）／粒子／雨／ECHO残響エフェクト。
 * 残響は「白い輪郭・微光・楽音の余韻・ノイズ」まで。人物の顔・声は描かない。 */
window.RW_FX = (function () {
  const LAV = "#C9B8E8", VIO = "#7B6CE0", NAVY = "#1B2140";

  /* ============ 地点装飾（SVG文字列を返す） ============ */
  /* far: 背景レイヤー内の遠景装飾（プレースホルダー地点用） */
  function decoFar(loc, W, H) {
    const d = loc.bg.deco;
    if (loc.bg.type === "image") return "";
    let s = "";
    if (d === "plaza") {
      /* 月・遠景都市の稜線 */
      s += `<circle cx="${W * 0.68}" cy="${H * 0.22}" r="${H * 0.09}" fill="rgba(247,247,250,.85)"/>
            <circle cx="${W * 0.68}" cy="${H * 0.22}" r="${H * 0.14}" fill="rgba(247,247,250,.12)"/>`;
      let sky = "";
      for (let i = 0; i < 14; i++) {
        const x = (i / 14) * W, w = W * 0.045, h = H * (0.10 + ((i * 37) % 13) / 60);
        sky += `<rect x="${x}" y="${H * 0.56 - h}" width="${w}" height="${h}" fill="rgba(27,33,64,.10)"/>`;
      }
      s += sky;
    } else if (d === "roof") {
      /* 低い雲と遠景 */
      for (let i = 0; i < 4; i++) {
        s += `<ellipse cx="${W * (0.15 + i * 0.26)}" cy="${H * (0.16 + (i % 2) * 0.07)}"
               rx="${W * 0.2}" ry="${H * 0.035}" fill="rgba(247,247,250,.28)"/>`;
      }
      for (let i = 0; i < 10; i++) {
        const x = (i / 10) * W, w = W * 0.06, h = H * (0.06 + ((i * 53) % 11) / 90);
        s += `<rect x="${x}" y="${H * 0.62 - h}" width="${w}" height="${h}" fill="rgba(27,33,64,.12)"/>`;
      }
    }
    return s ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
      style="position:absolute;inset:0" preserveAspectRatio="none">${s}</svg>` : "";
  }

  /* near: ワールド平面の装飾（調査ポイントの目印を含む） */
  function decoMid(loc, W, H, groundY) {
    const d = loc.bg.deco;
    let s = "";
    const g = groundY;
    /* 共通：床の1pxライン */
    s += `<line x1="0" y1="${g}" x2="${W}" y2="${g}" stroke="rgba(27,33,64,.16)" stroke-width="1"/>`;

    if (d === "plaza") {
      /* 同心円の石畳と、譜面台のような影 */
      for (let i = 1; i <= 3; i++) {
        s += `<ellipse cx="${W * 0.5}" cy="${g}" rx="${W * 0.11 * i}" ry="${H * 0.018 * i}"
              fill="none" stroke="rgba(201,184,232,.30)" stroke-width="1"/>`;
      }
      const sx = W * 0.78, top = g - H * 0.16;
      s += `<g fill="rgba(27,33,64,.34)">
              <rect x="${sx - 1.5}" y="${top + H * 0.05}" width="3" height="${H * 0.11}"/>
              <path d="M ${sx - H * 0.028} ${top + H * 0.055} l ${H * 0.056} 0 l ${H * 0.012} ${-H * 0.045} l ${-H * 0.056} 0 z"/>
              <path d="M ${sx - H * 0.02} ${g} l ${H * 0.04} 0 l ${-H * 0.012} ${-H * 0.02} l ${-H * 0.016} 0 z"/>
            </g>`;
    } else if (d === "corridor") {
      /* ガラスの方立と手すり・床の反射 */
      const step = Math.max(120, W / 18);
      for (let x = step; x < W; x += step) {
        s += `<line x1="${x}" y1="0" x2="${x}" y2="${g}" stroke="rgba(123,108,224,.10)" stroke-width="1"/>`;
      }
      s += `<line x1="0" y1="${g - H * 0.11}" x2="${W}" y2="${g - H * 0.11}" stroke="rgba(27,33,64,.22)" stroke-width="1"/>
            <line x1="0" y1="${g - H * 0.095}" x2="${W}" y2="${g - H * 0.095}" stroke="rgba(27,33,64,.12)" stroke-width="1"/>
            <rect x="0" y="${g}" width="${W}" height="${H - g}" fill="rgba(201,184,232,.10)"/>`;
    } else if (d === "roof") {
      /* 縁の手すり（右側）と廃通信塔の残骸・機器箱 */
      const railTop = g - H * 0.085;
      s += `<g stroke="rgba(27,33,64,.42)" stroke-width="1.5" fill="none">
              <line x1="${W * 0.60}" y1="${railTop}" x2="${W}" y2="${railTop}"/>
              <line x1="${W * 0.60}" y1="${railTop + 8}" x2="${W}" y2="${railTop + 8}"/>`;
      for (let i = 0; i <= 8; i++) {
        const x = W * 0.60 + (W * 0.40) * (i / 8);
        s += `<line x1="${x}" y1="${railTop}" x2="${x}" y2="${g}"/>`;
      }
      s += `</g>`;
      const ax = W * 0.42;
      s += `<g fill="rgba(27,33,64,.34)">
              <rect x="${ax - H * 0.035}" y="${g - H * 0.05}" width="${H * 0.07}" height="${H * 0.05}"/>
              <rect x="${ax - 1.5}" y="${g - H * 0.17}" width="3" height="${H * 0.12}"/>
              <line x1="${ax}" y1="${g - H * 0.17}" x2="${ax - H * 0.03}" y2="${g - H * 0.05}" stroke="rgba(27,33,64,.34)" stroke-width="1.5"/>
            </g>
            <ellipse cx="${W * 0.3}" cy="${g + 4}" rx="${W * 0.06}" ry="3" fill="rgba(201,184,232,.25)"/>
            <ellipse cx="${W * 0.55}" cy="${g + 5}" rx="${W * 0.04}" ry="2.5" fill="rgba(201,184,232,.22)"/>`;
    } else if (d === "lab") {
      /* 白い解析卓とスクリーン */
      const cx = W * 0.44, top = g - H * 0.085;
      s += `<g>
              <rect x="${cx - H * 0.09}" y="${top}" width="${H * 0.18}" height="${H * 0.085}"
                    fill="rgba(255,255,255,.62)" stroke="rgba(123,108,224,.4)" stroke-width="1" rx="2"/>
              <line x1="${cx - H * 0.06}" y1="${top + H * 0.02}" x2="${cx + H * 0.06}" y2="${top + H * 0.02}" stroke="${VIO}" stroke-width="1" opacity=".5"/>
              <line x1="${cx - H * 0.06}" y1="${top + H * 0.035}" x2="${cx + H * 0.02}" y2="${top + H * 0.035}" stroke="${LAV}" stroke-width="1" opacity=".6"/>
            </g>`;
      const sx = W * 0.74, st = g - H * 0.30;
      s += `<g>
              <rect x="${sx - H * 0.075}" y="${st}" width="${H * 0.15}" height="${H * 0.1}"
                    fill="rgba(255,255,255,.5)" stroke="rgba(123,108,224,.35)" stroke-width="1"/>
              <line x1="${sx - H * 0.075}" y1="${st + H * 0.1}" x2="${sx}" y2="${g}" stroke="rgba(123,108,224,.2)" stroke-width="1"/>
              <line x1="${sx - H * 0.05}" y1="${st + H * 0.025}" x2="${sx + H * 0.05}" y2="${st + H * 0.025}" stroke="${LAV}" stroke-width="1" opacity=".7"/>
              <line x1="${sx - H * 0.05}" y1="${st + H * 0.05}" x2="${sx + H * 0.03}" y2="${st + H * 0.05}" stroke="${LAV}" stroke-width="1" opacity=".5"/>
            </g>`;
    } else if (d === "resona") {
      /* 記録球の台座と、固定具のある椅子・進行率の壁面表示 */
      const px = W * 0.40;
      s += `<g>
              <rect x="${px - H * 0.02}" y="${g - H * 0.09}" width="${H * 0.04}" height="${H * 0.09}"
                    fill="rgba(255,255,255,.55)" stroke="rgba(201,184,232,.5)" stroke-width="1"/>
              <circle cx="${px}" cy="${g - H * 0.115}" r="${H * 0.022}"
                    fill="rgba(201,184,232,.35)" stroke="rgba(123,108,224,.5)" stroke-width="1"/>
            </g>`;
      const chx = W * 0.70, seat = g - H * 0.075;
      s += `<g stroke="rgba(27,33,64,.4)" stroke-width="1.5" fill="rgba(255,255,255,.4)">
              <rect x="${chx - H * 0.05}" y="${seat}" width="${H * 0.1}" height="${H * 0.012}" rx="2"/>
              <rect x="${chx + H * 0.038}" y="${seat - H * 0.11}" width="${H * 0.012}" height="${H * 0.11}" rx="2"/>
              <line x1="${chx - H * 0.04}" y1="${seat}" x2="${chx - H * 0.04}" y2="${g}"/>
              <line x1="${chx + H * 0.04}" y1="${seat}" x2="${chx + H * 0.04}" y2="${g}"/>
              <rect x="${chx - H * 0.052}" y="${seat - H * 0.006}" width="${H * 0.014}" height="${H * 0.006}" fill="rgba(123,108,224,.45)" stroke="none"/>
              <rect x="${chx + H * 0.038}" y="${seat - H * 0.006}" width="${H * 0.014}" height="${H * 0.006}" fill="rgba(123,108,224,.45)" stroke="none"/>
            </g>
            <text x="${W * 0.56}" y="${g - H * 0.34}" font-family="Menlo,Consolas,monospace" font-size="10"
                  letter-spacing="3" fill="rgba(123,108,224,.4)">ADJ&#160;070&#8725;100</text>`;
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
      style="position:absolute;inset:0" preserveAspectRatio="none">${s}</svg>`;
  }

  /* ============ 粒子・雨・残響（Canvas） ============ */
  let parts = [];      // {wx, y, vx, vy, life, max, r, c, kind}
  let effects = [];    // 時限エフェクト {kind, wx, gy, t, dur, ...}
  let rainOn = false, drops = [];
  let ambientKind = null;

  function setAmbient(kind) { ambientKind = kind; parts = parts.filter(p => p.kind !== "mote"); }
  function setRain(v) { rainOn = v; if (!v) drops = []; }

  function spawnMote(vw, vh, camX) {
    parts.push({
      kind: "mote",
      wx: camX + Math.random() * vw,
      y: vh * (0.3 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 6,
      life: 0, max: 6 + Math.random() * 5,
      r: 1 + Math.random() * 1.6,
      c: Math.random() < 0.5 ? "247,247,250" : "201,184,232"
    });
  }

  function trigger(fxId, wx, gy, vh) {
    const t0 = performance.now() / 1000;
    if (fxId === "fx_gather") {
      /* 光の粒が一瞬人型に集まりかけて散る */
      const cx = wx, cy = gy - vh * 0.17;
      for (let i = 0; i < 42; i++) {
        const a = Math.random() * Math.PI * 2, rr = vh * (0.10 + Math.random() * 0.16);
        parts.push({
          kind: "gather",
          wx: cx + Math.cos(a) * rr * 1.6, y: cy + Math.sin(a) * rr,
          tx: cx + (Math.random() - 0.5) * vh * 0.045,
          ty: cy + (Math.random() - 0.5) * vh * 0.13,
          vx: 0, vy: 0, life: 0, max: 2.4,
          r: 1 + Math.random() * 1.8, c: "247,247,250"
        });
      }
      effects.push({ kind: "gatherGlow", wx: cx, gy, t: t0, dur: 2.4, vh });
    } else if (fxId === "fx_outline") {
      effects.push({ kind: "outline", wx, gy, t: t0, dur: 1.1, vh });
    } else if (fxId === "fx_breath") {
      effects.push({ kind: "glowdot", wx, gy, t: t0, dur: 2.2, vh });
    } else if (fxId === "fx_mismatch") {
      effects.push({ kind: "mismatch", wx, gy, t: t0, dur: 1.8, vh });
    } else if (fxId === "fx_sit") {
      effects.push({ kind: "sit", wx, gy, t: t0, dur: 1.4, vh });
    }
  }

  function update(dt, env) {
    /* env: {vw, vh, camX} */
    if (ambientKind === "motes" && parts.filter(p => p.kind === "mote").length < 26 && Math.random() < 0.3) {
      spawnMote(env.vw, env.vh, env.camX);
    }
    for (const p of parts) {
      p.life += dt;
      if (p.kind === "gather") {
        const k = Math.min(1, p.life / 1.0);
        if (p.life < 1.2) { /* 収束 */
          p.wx += (p.tx - p.wx) * Math.min(1, dt * 3.2);
          p.y += (p.ty - p.y) * Math.min(1, dt * 3.2);
        } else {           /* 霧散 */
          if (!p.sx) { p.sx = (Math.random() - 0.5) * 60; p.sy = -20 - Math.random() * 40; }
          p.wx += p.sx * dt; p.y += p.sy * dt;
        }
      } else {
        p.wx += p.vx * dt; p.y += p.vy * dt;
      }
    }
    parts = parts.filter(p => p.life < p.max);

    if (rainOn) {
      while (drops.length < 90) {
        drops.push({ x: Math.random() * env.vw, y: -20 - Math.random() * env.vh,
                     v: env.vh * (0.9 + Math.random() * 0.5), l: 9 + Math.random() * 10 });
      }
      const gy = env.groundY;
      for (const d of drops) {
        d.y += d.v * dt; d.x -= d.v * 0.06 * dt;
        if (d.y > gy) {
          effects.push({ kind: "splash", sx: d.x, gy, t: performance.now() / 1000, dur: 0.3 });
          d.y = -20; d.x = Math.random() * env.vw;
        }
      }
    }
    const tnow = performance.now() / 1000;
    effects = effects.filter(e => tnow - e.t < e.dur);
  }

  function drawCanvas(ctx, env) {
    const { camX, vh } = env;
    const tnow = performance.now() / 1000;

    /* 粒子 */
    for (const p of parts) {
      const a = p.kind === "gather"
        ? (p.life < 1.2 ? Math.min(1, p.life * 2) : Math.max(0, 1 - (p.life - 1.2) / 1.2))
        : Math.sin(Math.PI * Math.min(1, p.life / p.max));
      ctx.fillStyle = `rgba(${p.c},${(0.55 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.wx - camX, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 時限エフェクト */
    for (const e of effects) {
      const k = (tnow - e.t) / e.dur;
      const x = (e.wx !== undefined ? e.wx - camX : e.sx);
      if (e.kind === "outline") {
        /* ガラスに白い輪郭が一瞬映る */
        const a = k < 0.3 ? k / 0.3 : Math.max(0, 1 - (k - 0.3) / 0.7);
        ctx.save();
        ctx.shadowColor = "rgba(247,247,250,.9)"; ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(247,247,250,${(0.7 * a).toFixed(3)})`;
        ctx.lineWidth = 2;
        const h = e.vh * 0.26, w = h * 0.34;
        r2(ctx, x - w / 2, e.gy - e.vh * 0.09 - h, w, h, w * 0.4);
        ctx.stroke();
        ctx.restore();
      } else if (e.kind === "gatherGlow") {
        const a = Math.sin(Math.PI * Math.min(1, k)) * 0.16;
        const cy = e.gy - e.vh * 0.17;
        const gr = ctx.createRadialGradient(x, cy, 0, x, cy, e.vh * 0.16);
        gr.addColorStop(0, `rgba(247,247,250,${a})`);
        gr.addColorStop(1, "rgba(247,247,250,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(x - e.vh * 0.2, cy - e.vh * 0.2, e.vh * 0.4, e.vh * 0.4);
      } else if (e.kind === "glowdot") {
        /* チョーカー型の微光が縁に残る */
        const a = Math.sin(Math.PI * Math.min(1, k));
        const y = e.gy - e.vh * 0.10;
        ctx.save();
        ctx.shadowColor = "rgba(201,184,232,.95)"; ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(233,228,255,${(0.85 * a).toFixed(3)})`;
        r2(ctx, x - 7, y - 2, 14, 4, 2);
        ctx.fill();
        ctx.restore();
      } else if (e.kind === "mismatch") {
        /* 解析画面に「照合不能」の一行が明滅 */
        const blink = (Math.floor(k * 6) % 2 === 0) ? 1 : 0.15;
        ctx.save();
        ctx.font = "10px Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(123,108,224,${(0.9 * blink * (1 - k * 0.4)).toFixed(3)})`;
        ctx.fillText("【 照 合 不 能 】", x, e.gy - e.vh * 0.245);
        ctx.restore();
      } else if (e.kind === "sit") {
        /* 白いノイズが椅子の上に一拍だけ座る */
        const a = k < 0.25 ? k / 0.25 : (k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1);
        const seatY = e.gy - e.vh * 0.075;
        for (let i = 0; i < 46; i++) {
          const nx = x + (Math.random() - 0.5) * e.vh * 0.07;
          const ny = seatY - Math.random() * e.vh * 0.17;
          ctx.fillStyle = `rgba(247,247,250,${(Math.random() * 0.55 * a).toFixed(3)})`;
          ctx.fillRect(nx, ny, 2, 2);
        }
      } else if (e.kind === "splash") {
        const a = 1 - k;
        ctx.strokeStyle = `rgba(201,184,232,${(0.4 * a).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.sx, e.gy, 2 + k * 5, 0, Math.PI, true);
        ctx.stroke();
      }
    }

    /* 雨 */
    if (rainOn) {
      ctx.strokeStyle = "rgba(140,150,175,.38)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.l * 0.12, d.y + d.l);
      }
      ctx.stroke();
    }
  }

  function r2(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function clear() { parts = []; effects = []; drops = []; }

  return { decoFar, decoMid, trigger, update, drawCanvas, setRain, setAmbient, clear };
})();
