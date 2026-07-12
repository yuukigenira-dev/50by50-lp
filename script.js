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
  var RAIN_COLOR = '124,113,212'; /* 青紫（原色背景でも見えるよう濃いめ） */

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
      a: .3 + Math.random() * .25 };
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
    ctx.lineWidth = 1.15;
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
      ctx.strokeStyle = 'rgba(164,153,230,' + (fade * .75) + ')';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (p < .4) {
        ctx.strokeStyle = 'rgba(110,99,198,' + (fade * .5) + ')';
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

// ジュークボックスとBGMの二重再生防止: iframe操作を検知してBGMを自動一時停止
(function () {
  var audio = document.getElementById('siteBgm');
  var wrap = document.querySelector('.jukebox-wrap');
  if (!audio || !wrap) return;
  var iframe = wrap.querySelector('iframe');

  var pauseBgm = function () { if (!audio.paused) audio.pause(); };

  /* ラッパー上のタップ/クリック（iframe外周）で停止 */
  wrap.addEventListener('pointerdown', pauseBgm);
  /* iframe内のクリックは直接拾えないため、iframeへのフォーカス移動で検知 */
  window.addEventListener('blur', function () {
    if (iframe && document.activeElement === iframe) pauseBgm();
  });
})();

// はじめ方は、6つ。— 横回転セレクター（ドラッグ/タップ/←→キー）
(function () {
  "use strict";
  var stage = document.getElementById('entryStage');
  var dots = document.getElementById('entryDots');
  var section = document.getElementById('entries');
  if (!stage || !dots || !section) return;

  var ENTRIES = [
    { no: "I", en: "READ", jp: "小説で世界に触れる", chip: "COMING SOON", live: false, glyph: "読",
      kicker: "I ── READ", title: "小説で世界に触れる",
      desc: "第1巻(Episode 01–04)を Kindle Unlimited で近日公開。",
      cta: "近日公開", href: null },
    { no: "II", en: "LISTEN", jp: "彼らの武器を、聴く。", chip: "公開中", live: true, glyph: "聴",
      kicker: "II ── LISTEN", title: "彼らの武器を、聴く。",
      desc: "泪はバイオリンを奏で、薫は歌う——戦いの音、全19曲。",
      cta: "ジュークボックスで聴く", href: "#music" },
    { no: "III", en: "WATCH", jp: "ショート映像で世界を覗く", chip: "更新中", live: true, glyph: "観",
      kicker: "III ── WATCH", title: "ショート映像で世界を覗く",
      desc: "ふたりの「事故距離」はここから。最新のショート映像とカルーセル漫画をTikTokで公開中。",
      cta: "TikTokで見る", href: "https://www.tiktok.com/@renfew_ito" },
    { no: "IV", en: "PLAY", jp: "特別版ノベルゲーム", chip: "IN DEVELOPMENT", live: false, glyph: "遊",
      kicker: "IV ── PLAY", title: "特別版ノベルゲーム",
      desc: "選択で変化する物語体験。Episode 0 を開発中——もうひとつの50by50を、あなたの選択で。",
      cta: "続報を待つ", href: null },
    { no: "V", en: "RHYTHM", jp: "50by50音ゲーム", chip: "COMING SOON", live: false, glyph: "律",
      kicker: "V ── RHYTHM", title: "50by50音ゲーム。",
      desc: "メイン曲に合わせてリズムを体感しよう。",
      cta: "近日公開", href: null },
    { no: "VI", en: "WORLD", jp: "50by50簡易メタバース", chip: "DEVELOPMENT", live: false, glyph: "歩",
      kicker: "VI ── WORLD", title: "50by50簡易メタバース。",
      desc: "幻想都市を歩き回ろう。",
      cta: "続報を待つ", href: null }
  ];

  var N = ENTRIES.length;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* カード生成 */
  var cards = ENTRIES.map(function (e, i) {
    var el = document.createElement('div');
    el.className = 'entry-card';
    el.setAttribute('role', 'option');
    el.dataset.i = i;
    el.innerHTML = '<div class="no">' + e.no + '</div><div class="en">' + e.en + '</div>' +
      '<div class="chip' + (e.live ? ' live' : '') + '">' + e.chip + '</div>' +
      '<div class="art">' + e.glyph + '</div><div class="jp">' + e.jp + '</div>';
    stage.appendChild(el);
    return el;
  });
  var lane = document.createElement('div');
  lane.className = 'entry-lane';
  stage.appendChild(lane);
  ENTRIES.forEach(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', '入り口 ' + (i + 1));
    b.addEventListener('click', function () { goTo(i); });
    dots.appendChild(b);
  });

  /* 回転状態: pos(実数)→target(整数)へ緩やかに追従 */
  var pos = 0, target = 0, dragging = false, lastShown = -1;

  function shortest(i, p) { return ((i - p + N / 2) % N + N) % N - N / 2; }

  function render() {
    for (var i = 0; i < N; i++) {
      var d = shortest(i, pos);
      var abs = Math.abs(d);
      cards[i].style.transform =
        'translateX(' + (d * 72) + '%) ' +
        'rotateY(' + (d * -36) + 'deg) ' +
        'translateZ(' + (-abs * 150) + 'px) ' +
        'scale(' + (1 - abs * 0.11) + ')';
      cards[i].style.opacity = abs > 1.55 ? 0 : 1 - abs * 0.22;
      cards[i].style.zIndex = String(100 - Math.round(abs * 10));
      cards[i].style.pointerEvents = abs > 1.55 ? 'none' : 'auto';
      cards[i].classList.toggle('active', abs < .5);
    }
    var act = ((Math.round(pos) % N) + N) % N;
    if (act !== lastShown) { lastShown = act; showReadout(act); }
  }

  function showReadout(i) {
    var e = ENTRIES[i];
    document.getElementById('entryKicker').textContent = e.kicker;
    document.getElementById('entryTitle').textContent = e.title;
    document.getElementById('entryDesc').textContent = e.desc;
    var cta = document.getElementById('entryCta');
    cta.textContent = e.cta;
    if (e.href) {
      cta.href = e.href;
      if (e.href.charAt(0) === '#') {
        /* ページ内アンカーは同一タブでスクロール */
        cta.removeAttribute('target');
        cta.removeAttribute('rel');
      } else {
        cta.target = '_blank';
        cta.rel = 'noopener';
      }
      cta.removeAttribute('aria-disabled');
    } else {
      cta.removeAttribute('href');
      cta.removeAttribute('target');
      cta.setAttribute('aria-disabled', 'true');
    }
    var ds = dots.children;
    for (var k = 0; k < N; k++) ds[k].classList.toggle('on', k === i);
  }

  function loop() {
    if (!dragging) {
      var diff = target - pos;
      pos += reduced ? diff : diff * 0.14;
      if (Math.abs(target - pos) < 0.001) pos = target;
    }
    render();
    requestAnimationFrame(loop);
  }

  function goTo(i) { target = pos + shortest(i, pos); }

  /* ドラッグ/スワイプ */
  var startX = 0, startPos = 0, moved = 0;
  stage.addEventListener('pointerdown', function (ev) {
    dragging = true; moved = 0; startX = ev.clientX; startPos = pos;
    stage.classList.add('dragging');
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    pos = startPos - dx / 230;
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    target = Math.round(pos);
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  /* カードタップで選択(ドラッグと区別) */
  cards.forEach(function (el, i) {
    el.addEventListener('click', function () { if (moved < 8) goTo(i); });
  });

  /* キーボード: セレクターが画面内にあるときだけ←→で回す（ページ操作と干渉させない） */
  var inView = true;
  if ('IntersectionObserver' in window) {
    inView = false;
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.25 }).observe(section);
  }
  window.addEventListener('keydown', function (ev) {
    if (!inView || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === 'ArrowRight') target = Math.round(pos) + 1;
    if (ev.key === 'ArrowLeft') target = Math.round(pos) - 1;
  });

  render(); showReadout(0); loop();
})();

