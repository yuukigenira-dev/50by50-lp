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

