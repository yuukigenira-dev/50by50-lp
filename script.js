/* 50by50 LP — script.js */

// スクロール時 fade-in（IntersectionObserver）
(function () {
  const targets = document.querySelectorAll('.fade');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(t => io.observe(t));
})();

// 立ち絵タップ切り替え（通常⇄戦闘/潜入）
(function () {
  document.querySelectorAll('.char-toggle').forEach(fig => {
    const toggle = () => {
      const on = fig.classList.toggle('show-alt');
      fig.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    fig.addEventListener('click', toggle);
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();

// 背景動画: ファイル未配置・再生不可の場合はposter表示のまま静かにフォールバック
(function () {
  const video = document.querySelector('.hero-bg video');
  if (!video) return;
  video.addEventListener('error', () => { video.removeAttribute('autoplay'); }, true);
  const p = video.play && video.play();
  if (p && typeof p.catch === 'function') p.catch(() => {/* posterのまま */});
})();

// ヒーロー背景: 小雨×水面波紋（canvas 1枚 / prefers-reduced-motion 時は静止画のまま）
(function () {
  "use strict";
  var cv = document.getElementById('heroRainFx');
  if (!cv || !cv.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; /* 静止画フォールバック */

  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var WATER_TOP = 0.58;           /* 水面ラインの高さ(比率) */
  var RAIN_COLOR = '190,186,225'; /* 淡いラベンダーグレー */

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initRain();
  }

  /* ---- 小雨 ---- */
  var drops = [];
  function initRain() {
    var n = Math.round(W * H / 16000); /* 密度: 小雨 */
    drops = [];
    for (var i = 0; i < n; i++) drops.push(newDrop(Math.random() * H));
  }
  function newDrop(y) {
    return { x: Math.random() * W, y: (y != null ? y : -20),
      len: 24 + Math.random() * 24, spd: 240 + Math.random() * 200,
      a: .14 + Math.random() * .22 };
  }

  /* ---- 波紋 ---- */
  var ripples = [];
  function spawnRipple(x, y, big) {
    ripples.push({ x: x, y: y, t: 0,
      dur: .9 + Math.random() * .9,
      maxR: (big ? 34 + Math.random() * 46 : 14 + Math.random() * 20) });
  }
  var rippleTimer = 0;

  var last = performance.now();
  function frame(now) {
    if (!running) return;
    /* rAFのタイムスタンプはlastより過去になり得るため0未満にしない */
    var dt = Math.min(Math.max((now - last) / 1000, 0), .05); last = now;
    ctx.clearRect(0, 0, W, H);
    var waterY = H * WATER_TOP;

    /* 雨 */
    ctx.lineWidth = 1;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      d.y += d.spd * dt; d.x += d.spd * dt * 0.055; /* わずかな斜め */
      ctx.strokeStyle = 'rgba(' + RAIN_COLOR + ',' + d.a + ')';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.055, d.y - d.len);
      ctx.stroke();
      /* 水面帯に入ったら消え、たまに着水波紋を残す */
      var limit = waterY + (H - waterY) * (0.15 + ((i * 7919) % 100) / 100 * 0.8);
      if (d.y > limit) {
        if (Math.random() < .18) spawnRipple(d.x, limit, false);
        drops[i] = newDrop();
      }
    }

    /* 定期的な大きめの波紋(雨とは別の、水面の呼吸) */
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      rippleTimer = .5 + Math.random() * .9;
      spawnRipple(Math.random() * W, waterY + Math.random() * (H - waterY) * .85, true);
    }

    /* 波紋の描画 */
    for (var k = ripples.length - 1; k >= 0; k--) {
      var r = ripples[k]; r.t += dt;
      var p = r.t / r.dur;
      if (p >= 1) { ripples.splice(k, 1); continue; }
      var rad = r.maxR * p;
      var fade = Math.pow(1 - p, 1.6);
      var squash = .26 + (r.y - H * WATER_TOP) / (H * (1 - WATER_TOP)) * .1; /* 手前ほど楕円が開く */
      ctx.strokeStyle = 'rgba(235,232,250,' + (fade * .55) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (p < .4) {
        ctx.strokeStyle = 'rgba(184,175,224,' + (fade * .35) + ')';
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad * .55, rad * squash * .55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  /* ヒーローが画面外・タブ非表示のあいだは描画を止める（スクロール性能対策） */
  var running = false;
  var rafId = 0;
  var heroVisible = true;
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(rafId);
    }
  }
  var hero = cv.closest('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      setRunning(heroVisible && !document.hidden);
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    setRunning(heroVisible && !document.hidden);
  });

  window.addEventListener('resize', resize);
  resize();
  setRunning(true);
})();

// BGM ON/OFF: ユーザー操作で30秒MP3をループ再生
(function () {
  const audio = document.getElementById('siteBgm');
  const btn = document.querySelector('[data-bgm-toggle]');
  if (!audio || !btn) return;

  const label = btn.querySelector('.bgm-label');
  audio.volume = 0.52;

  const setState = (on) => {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'BGMをオフにする' : 'BGMをオンにする');
    if (label) label.textContent = on ? 'BGM ON' : 'BGM OFF';
  };

  btn.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        setState(true);
      } catch (err) {
        setState(false);
      }
    } else {
      audio.pause();
      setState(false);
    }
  });

  audio.addEventListener('play', () => setState(true));
  audio.addEventListener('pause', () => setState(false));
})();

