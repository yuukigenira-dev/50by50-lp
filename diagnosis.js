/* ==========================================================
   50by50 LP — diagnosis.js（50:50診断）
   設問・結果タイプ・文言は、このファイル冒頭の
   DIAG_CONFIG / QUESTIONS / TYPES を編集するだけで差し替え可能。
   ========================================================== */
(function () {
  'use strict';

  /* ===== 設定 ===== */
  const DIAG_CONFIG = {
    siteUrl: '',                       // TODO: 公開後にURLを設定（例 'https://xxxx.github.io/50by50-site/'）
    hashtag: '#50by50',
    cardFileName: '50by50-check.png'
  };

  /* ===== 設問 =====
     w = MISSION側（m）を選んだ時の加点。合計100。
     6問中のMISSION回答数と結果帯が必ず一致する重み配分:
     6問=100 / 5問=81〜85 / 4問=63〜70 / 3問=46〜54 / 2問=30〜37 / 1問=15〜19 / 0問=0 */
  const QUESTIONS = [
    { w: 15, q: '標的を捕捉した。だが、様子がおかしい。', m: '予定通り、撃つ', e: '直接、確かめる' },
    { w: 18, q: '敵が目の前で、足場から落ちた。',         m: '好機。見届ける', e: '躰が先に動く' },
    { w: 16, q: '任務中、知らないはずの曲に足が止まった。', m: '雑音として処理する', e: '最後まで、聴いてしまう' },
    { w: 17, q: '敵の急所を、握った。',                   m: '使う。それが仕事だ', e: '……使えない' },
    { w: 15, q: '「次は助けるな」と言われた。',           m: '了解、と返す', e: 'たぶん、また助ける' },
    { w: 19, q: '夢に、知らない記憶が混ざる。',           m: '乱れとして報告する', e: '誰にも言わず、抱えておく' }
  ];

  /* ===== 結果タイプ（MISSION%で上から判定） ===== */
  const TYPES = [
    { min: 80, name: '完全遂行型',  en: 'TYPE — EXECUTION',   closer: 'CLOSER TO — ECHO',
      copy: 'あなたは引き金を引ける。——まだ、"あの人"に会っていないから。' },
    { min: 60, name: '偽装優先型',  en: 'TYPE — CAMOUFLAGE',  closer: 'CLOSER TO — ECHO',
      copy: '揺れていない顔が、いちばん揺れている。' },
    { min: 41, name: '完全な50:50', en: 'TYPE — EQUILIBRIUM', closer: 'BETWEEN THE TWO',
      copy: '任務と感情が、あなたの中で拮抗している。' },
    { min: 21, name: '残響型',      en: 'TYPE — REVERB',      closer: 'CLOSER TO — SHADE',
      copy: '覚えていないのに、躰が答える。' },
    { min: 0,  name: '感情決壊型',  en: 'TYPE — OVERFLOW',    closer: 'CLOSER TO — SHADE',
      copy: '運命があなたを敵と呼んでも、もう遅い。' }
  ];

  /* ===== 要素取得 ===== */
  const stage = document.getElementById('diagStage');
  if (!stage) return;

  const views = {
    intro:    stage.querySelector('[data-diag-view="intro"]'),
    question: stage.querySelector('[data-diag-view="question"]'),
    result:   stage.querySelector('[data-diag-view="result"]')
  };
  const el = {
    start:    stage.querySelector('.diag-start'),
    qnum:     stage.querySelector('.diag-qnum'),
    qtotal:   stage.querySelector('.diag-qtotal'),
    qbar:     stage.querySelector('.diag-progress-bar i'),
    qtext:    stage.querySelector('.diag-qtext'),
    choiceM:  stage.querySelector('.diag-choice[data-side="m"]'),
    choiceE:  stage.querySelector('.diag-choice[data-side="e"]'),
    type:     stage.querySelector('.diag-type'),
    typeEn:   stage.querySelector('.diag-type-en'),
    m:        stage.querySelector('.diag-m'),
    e:        stage.querySelector('.diag-e'),
    gaugeDot: stage.querySelector('.diag-gauge .gauge-bar i'),
    copy:     stage.querySelector('.diag-result-copy'),
    cardImg:  stage.querySelector('.diag-card-img'),
    share:    stage.querySelector('.diag-share'),
    save:     stage.querySelector('.diag-save'),
    copyCap:  stage.querySelector('.diag-copy-cap'),
    retry:    stage.querySelector('.diag-retry')
  };

  /* ===== 状態 ===== */
  let idx = 0;
  let mission = 0;
  let cardFile = null;   // 共有用（ユーザー操作前に生成しておく）
  let cardUrl = null;    // 保存・プレビュー用 ObjectURL
  let caption = '';

  const pad = (n) => String(n).padStart(2, '0');

  function show(name) {
    Object.keys(views).forEach((k) => { views[k].hidden = (k !== name); });
  }

  function renderQuestion() {
    const item = QUESTIONS[idx];
    el.qnum.textContent = pad(idx + 1);
    el.qtotal.textContent = pad(QUESTIONS.length);
    el.qbar.style.width = ((idx) / QUESTIONS.length * 100) + '%';
    el.qtext.textContent = item.q;
    el.choiceM.textContent = item.m;
    el.choiceE.textContent = item.e;
  }

  function answer(side) {
    if (side === 'm') mission += QUESTIONS[idx].w;
    idx += 1;
    if (idx < QUESTIONS.length) {
      renderQuestion();
    } else {
      renderResult();
    }
  }

  function typeFor(score) {
    return TYPES.find((t) => score >= t.min) || TYPES[TYPES.length - 1];
  }

  function renderResult() {
    const m = mission;
    const e = 100 - m;
    const type = typeFor(m);

    el.type.textContent = type.name;
    el.typeEn.textContent = type.en;
    el.m.textContent = m;
    el.e.textContent = e;
    el.copy.textContent = type.copy;

    caption = 'わたしの50:50は「' + type.name + '」（任務' + m + ':感情' + e + '）だった。 '
      + DIAG_CONFIG.hashtag + ' #創作BL'
      + (DIAG_CONFIG.siteUrl ? '\n' + DIAG_CONFIG.siteUrl : '');

    show('result');
    // ゲージのひし形をユーザーの比率位置へ（描画後に動かすと transition が効く）
    el.gaugeDot.style.left = '50%';
    requestAnimationFrame(() => { el.gaugeDot.style.left = m + '%'; });

    // 共有はユーザー操作と同期で呼ぶ必要があるため、カードは先に生成して保持する
    generateCard(type, m, e).then((blob) => {
      if (!blob) return;
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardFile = new File([blob], DIAG_CONFIG.cardFileName, { type: 'image/png' });
      cardUrl = URL.createObjectURL(blob);
      el.cardImg.src = cardUrl;
    }).catch(() => { /* カード生成失敗時はテキスト結果のみ表示 */ });
  }

  /* ===== カード生成（Canvas / 3:4 = 1080×1440） ===== */
  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  async function generateCard(type, m, e) {
    const C = {
      base:   cssVar('--base', '#F6F4F1'),
      dark1:  cssVar('--dark-1', '#1E1B2E'),
      dark2:  cssVar('--dark-2', '#252135'),
      dark3:  cssVar('--dark-3', '#2C2740'),
      sub1:   cssVar('--sub-1', '#CFC9E2'),
      sub2:   cssVar('--sub-2', '#C4BEDD'),
      accent: cssVar('--accent-rui', '#9D8FE6'),
      soft:   cssVar('--accent-soft', '#A89CDB')
    };

    // フォント読み込みを待つ（未ロードのままだと代替書体で描画される）
    try {
      await Promise.all([
        document.fonts.load('500 92px "Shippori Mincho B1"'),
        document.fonts.load('400 34px "Shippori Mincho B1"'),
        document.fonts.load('400 30px "Cormorant Garamond"'),
        document.fonts.load('italic 400 34px "Cormorant Garamond"')
      ]);
    } catch (err) { /* 読めなければそのまま描画 */ }

    const W = 1080, H = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cx = W / 2;

    // 地
    ctx.fillStyle = C.base;
    ctx.fillRect(0, 0, W, H);

    // 淡いラベンダーの面（hero-veil と同系）
    let g = ctx.createRadialGradient(W * 0.72, H * 0.16, 60, W * 0.72, H * 0.16, 620);
    g.addColorStop(0, 'rgba(207,201,226,0.42)');
    g.addColorStop(1, 'rgba(207,201,226,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W * 0.22, H * 0.86, 60, W * 0.22, H * 0.86, 640);
    g.addColorStop(0, 'rgba(196,190,221,0.38)');
    g.addColorStop(1, 'rgba(196,190,221,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 斜線（ロゴの╱ / char-slashと同じ言語）
    ctx.save();
    ctx.translate(cx, H * 0.46);
    ctx.rotate(18 * Math.PI / 180);
    const lg = ctx.createLinearGradient(0, -350, 0, 350);
    lg.addColorStop(0, 'rgba(157,143,230,0)');
    lg.addColorStop(0.5, 'rgba(157,143,230,0.55)');
    lg.addColorStop(1, 'rgba(157,143,230,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -350); ctx.lineTo(0, 350); ctx.stroke();
    ctx.restore();

    // 枠
    ctx.strokeStyle = C.sub2;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    // 文字ヘルパー（字間を手動で付けて中央揃え）
    const drawSpaced = (text, x, y, font, color, spacing) => {
      ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
      const chars = [...text];
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      let cur = x - total / 2;
      chars.forEach((ch, i) => { ctx.fillText(ch, cur, y); cur += widths[i] + spacing; });
    };
    const wrap = (text, maxWidth, font) => {
      ctx.font = font;
      const out = []; let line = '';
      for (const ch of [...text]) {
        if (ctx.measureText(line + ch).width > maxWidth && line) { out.push(line); line = ch; }
        else { line += ch; }
      }
      if (line) out.push(line);
      return out;
    };

    // 上部
    drawSpaced('PROJECT 50by50', cx, 168, '400 28px "Cormorant Garamond"', C.soft, 9);
    drawSpaced('50:50 CHECK', cx, 222, '400 26px "Cormorant Garamond"', C.dark3, 7);

    // タイプ名
    drawSpaced(type.name, cx, 640, '500 92px "Shippori Mincho B1"', C.dark1, 10);
    drawSpaced(type.en, cx, 712, 'italic 400 34px "Cormorant Garamond"', C.accent, 5);

    // ゲージ
    const gy = 860, gx1 = 330, gx2 = 750;
    ctx.strokeStyle = C.sub1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx1, gy); ctx.lineTo(gx2, gy); ctx.stroke();
    ctx.textAlign = 'right'; ctx.font = '400 30px "Cormorant Garamond"'; ctx.fillStyle = C.dark3;
    ctx.fillText('MISSION ' + m, gx1 - 26, gy + 10);
    ctx.textAlign = 'left';
    ctx.fillText('EMOTION ' + e, gx2 + 26, gy + 10);
    ctx.textAlign = 'start';
    // ひし形＝あなたの境界点
    const dx = gx1 + (gx2 - gx1) * (m / 100);
    ctx.save();
    ctx.translate(dx, gy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = C.accent; ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();

    // 添えコピー
    const copyFont = '400 34px "Shippori Mincho B1"';
    const lines = wrap(type.copy, W - 280, copyFont);
    lines.forEach((ln, i) => {
      drawSpaced(ln, cx, 990 + i * 58, copyFont, C.dark2, 4);
    });

    // 立ち位置
    drawSpaced(type.closer, cx, 990 + lines.length * 58 + 46, '400 24px "Cormorant Garamond"', C.soft, 6);

    // 下部（コンセプト＋導線焼き込み）
    drawSpaced('隣り合わせの、非対称。', cx, 1280, '400 30px "Shippori Mincho B1"', C.dark2, 6);
    const tagLine = DIAG_CONFIG.hashtag + (DIAG_CONFIG.siteUrl ? '   ' + DIAG_CONFIG.siteUrl.replace(/^https?:\/\//, '') : '');
    drawSpaced(tagLine, cx, 1330, '400 26px "Cormorant Garamond"', C.soft, 3);

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  /* ===== 共有・保存・コピー ===== */
  function downloadCard() {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = DIAG_CONFIG.cardFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  el.share.addEventListener('click', () => {
    if (cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
      navigator.share({ files: [cardFile], text: caption }).catch(() => { /* キャンセルは無視 */ });
    } else {
      downloadCard(); // 共有非対応環境は保存にフォールバック
    }
  });

  el.save.addEventListener('click', downloadCard);

  el.copyCap.addEventListener('click', () => {
    const done = () => {
      const prev = el.copyCap.textContent;
      el.copyCap.textContent = 'コピーしました';
      setTimeout(() => { el.copyCap.textContent = prev; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(caption).then(done).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = caption;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { /* 非対応 */ }
      ta.remove();
    }
  });

  /* ===== 進行 ===== */
  el.start.addEventListener('click', () => {
    idx = 0; mission = 0;
    renderQuestion();
    show('question');
  });
  el.choiceM.addEventListener('click', () => answer('m'));
  el.choiceE.addEventListener('click', () => answer('e'));
  el.retry.addEventListener('click', () => {
    idx = 0; mission = 0;
    cardFile = null;
    el.cardImg.removeAttribute('src');
    show('intro');
  });
})();
