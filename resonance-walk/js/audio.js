/* 50by50 Resonance Walk — audio.js
 * Web Audio合成の仮SE。音源ファイルなしで動作し、後日差し替え可能。
 * すべて控えめな音量に固定する。 */
window.RW_AUDIO = (function () {
  let ctx = null, master = null, enabled = true;
  let seBus = null, ambBus = null;
  let ambient = { nodes: [], id: null };
  /* BGM: HTMLAudioで統一（ストリーミング・省メモリ・file://互換）。
     デコード方式は1曲50〜80MBのバッファを要しモバイルで危険なため不採用。 */
  let bgm = { id: null, el: null, want: 0, on: true, fadeIv: null };
  const BGM_LEVEL = 0.16;   /* BGM実効音量の基準（SEはseBusで2.3倍に増幅し埋もれを防ぐ） */

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      seBus = ctx.createGain();  seBus.gain.value = 2.3;       /* SE増幅バス */
      seBus.connect(master);
      ambBus = ctx.createGain(); ambBus.gain.value = 1.0;
      ambBus.connect(master);

    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function out() { return seBus || master; }
  function ambOut() { return ambBus || master; }
  function now() { return ctx ? ctx.currentTime : 0; }

  /* --- 基本部品 --- */
  function noiseBuffer(sec) {
    const c = ac(); if (!c) return null;
    const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  /* --- 単発SE --- */
  const SE = {
    step(hard) { /* 足音：硬い床/柔らかい床 */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      const src = c.createBufferSource(); src.buffer = noiseBuffer(0.06);
      const f = c.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = hard ? 2200 : 900; f.Q.value = 1.2;
      const g = c.createGain(); env(g, t, 0.004, hard ? 0.05 : 0.035, 0.05);
      src.connect(f); f.connect(g); g.connect(out()); src.start(t);
    },
    hud() { /* HUD起動：細いブリップ */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(1320, t + 0.07);
      const g = c.createGain(); env(g, t, 0.006, 0.05, 0.12);
      o.connect(g); g.connect(out()); o.start(t); o.stop(t + 0.2);
    },
    log() { /* ログ取得：二音 */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      [[659.3, 0], [987.8, 0.09]].forEach(([f, dt]) => {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f;
        const g = c.createGain(); env(g, t + dt, 0.008, 0.06, 0.35);
        o.connect(g); g.connect(out()); o.start(t + dt); o.stop(t + dt + 0.5);
      });
    },
    echo() { /* 残響：気配のノイズスウェル＋淡い和音 */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      const src = c.createBufferSource(); src.buffer = noiseBuffer(1.4);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      src.connect(f); f.connect(g); g.connect(out()); src.start(t);
      [523.3, 784.0].forEach((fr, i) => {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = fr * (1 + 0.003 * i);
        const og = c.createGain(); env(og, t + 0.15, 0.3, 0.03, 1.0);
        o.connect(og); og.connect(out()); o.start(t); o.stop(t + 1.6);
      });
    },
    strings() { /* 弦の余韻（広場） */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      [392.0, 587.3, 880.0].forEach((fr, i) => {
        const o = c.createOscillator(); o.type = "triangle";
        o.frequency.value = fr * (1 + (Math.random() - 0.5) * 0.004);
        const g = c.createGain(); env(g, t + i * 0.05, 0.06, 0.035, 1.8);
        o.connect(g); g.connect(out()); o.start(t); o.stop(t + 2.4);
      });
    },
    breath() { /* 吐息のようなノイズ（屋上） */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      const src = c.createBufferSource(); src.buffer = noiseBuffer(1.0);
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      src.connect(f); f.connect(g); g.connect(out()); src.start(t);
    },
    dropTick() { /* 雨音が一粒ずつ分解するSE */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      for (let i = 0; i < 5; i++) {
        const o = c.createOscillator(); o.type = "sine";
        o.frequency.value = 2400 - i * 380;
        const g = c.createGain(); env(g, t + i * 0.09, 0.004, 0.03, 0.05);
        o.connect(g); g.connect(out()); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.1);
      }
    },
    deny() { /* 未解放・照合不能の小音 */
      const c = ac(); if (!c || !enabled) return;
      const t = now();
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 440;
      const g = c.createGain(); env(g, t, 0.005, 0.04, 0.1);
      o.connect(g); g.connect(out()); o.start(t); o.stop(t + 0.18);
    }
  };

  /* --- 環境音（地点ごとの静かなベッド） --- */
  function stopAmbient() {
    ambient.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} });
    ambient = { nodes: [], id: null };
  }
  function startAmbient(id, hasBgm) {
    const c = ac(); if (!c) return;
    if (ambient.id === id) return;
    stopAmbient();
    if (!enabled || !id) { ambient.id = id; return; }
    if (hasBgm && bgm.on && id !== "amb_rain") { ambient.id = id; return; }
    ambient.id = id;
    const g = c.createGain(); g.gain.value = 0; g.connect(out());
    g.gain.linearRampToValueAtTime(1, now() + 1.5);
    const nodes = [g];

    if (id === "amb_rain") { /* 雨のループ */
      const src = c.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1600;
      const vg = c.createGain(); vg.gain.value = 0.045;
      src.connect(f); f.connect(vg); vg.connect(g); src.start();
      nodes.push(src);
    } else if (id === "amb_lab" || id === "amb_resona") { /* 端末駆動音／低い電子ノイズ */
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.value = id === "amb_lab" ? 120 : 96;
      const vg = c.createGain(); vg.gain.value = id === "amb_lab" ? 0.02 : 0.014;
      o.connect(vg); vg.connect(g); o.start();
      nodes.push(o);
      const src = c.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
      const f = c.createBiquadFilter(); f.type = "bandpass";
      f.frequency.value = id === "amb_lab" ? 3200 : 2200; f.Q.value = 14;
      const ng = c.createGain(); ng.gain.value = 0.006;
      src.connect(f); f.connect(ng); ng.connect(g); src.start();
      nodes.push(src);
    } else { /* 夜気・通路：ごく薄い空気 */
      const src = c.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
      const vg = c.createGain(); vg.gain.value = 0.012;
      src.connect(f); f.connect(vg); vg.connect(g); src.start();
      nodes.push(src);
    }
    ambient.nodes = nodes;
  }
  function duckAmbient(sec) { /* 環境音とBGMが一拍下がる */
    const t = now();
    if (ctx && ambient.nodes[0]) {
      const g = ambient.nodes[0];
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.1);
      g.gain.linearRampToValueAtTime(1, t + 0.1 + (sec || 0.6));
    }
    if (bgm.el && !bgm.el.paused) {
      const el = bgm.el, v0 = bgm.baseVol || el.volume;
      try { el.volume = Math.max(0, v0 * 0.25); } catch (e) {}
      setTimeout(() => { try { if (bgm.el === el) el.volume = v0; } catch (e) {} },
        ((sec || 0.6) + 0.5) * 1000);
    }
  }

  /* ---- BGM（HTMLAudio・クロスフェード・ループ） ---- */
  function fadeEl(el, from, to, sec, done) {
    const steps = Math.max(4, Math.round(sec * 12));
    let i = 0;
    const iv = setInterval(() => {
      i++;
      try { el.volume = Math.min(1, Math.max(0, from + (to - from) * i / steps)); } catch (e) {}
      if (i >= steps) { clearInterval(iv); done && done(); }
    }, sec * 1000 / steps);
    return iv;
  }
  function stopBgm(fadeSec) {
    bgm.want++;
    if (bgm.fadeIv) { clearInterval(bgm.fadeIv); bgm.fadeIv = null; }
    const el = bgm.el;
    if (el) {
      const f = fadeSec == null ? 0.8 : fadeSec;
      fadeEl(el, el.volume, 0, Math.max(0.05, f), () => { try { el.pause(); el.src = ""; } catch (e) {} });
    }
    bgm.id = null; bgm.el = null; bgm.baseVol = 0;
  }
  function playBgm(id, src, gain) {
    if (!bgm.on || !src) { if (bgm.id) stopBgm(); return; }
    if (bgm.id === id) return;
    stopBgm(0.7);
    const token = ++bgm.want;
    const el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    const target = Math.min(1, (gain == null ? 1 : gain) * BGM_LEVEL);
    const begin = () => {
      if (token !== bgm.want) { try { el.pause(); } catch (e) {} return; }
      bgm.id = id; bgm.el = el; bgm.baseVol = target;
      bgm.fadeIv = fadeEl(el, 0, target, 1.2, () => { bgm.fadeIv = null; });
    };
    el.play().then(begin).catch(() => {
      /* 自動再生制限などで失敗した場合は次のジェスチャで再試行できるよう放置 */
    });
  }

  function setBgmEnabled(v) { bgm.on = v; if (!v) stopBgm(); }

  function setEnabled(v) {
    enabled = v;
    if (!v) stopAmbient();
  }
  return { se: SE, startAmbient, stopAmbient, duckAmbient, setEnabled, unlock: ac,
           playBgm, stopBgm, setBgmEnabled,
           bgmState: () => ({ id: bgm.id, playing: !!(bgm.el && !bgm.el.paused), vol: bgm.el ? +bgm.el.volume.toFixed(3) : 0, on: bgm.on }),
           isEnabled: () => enabled };
})();
