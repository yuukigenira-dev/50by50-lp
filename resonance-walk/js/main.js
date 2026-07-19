/* 50by50 Resonance Walk — main.js */
(function () {
  /* Tier機械検査：公開ビルドに public_max 超のログ本文が含まれていないか。
     （ロック枠 log_sealed_01 は body 空文字のみ許容） */
  const D = window.RW_DATA;
  const max = D.spoiler_tier_policy.public_max;
  const bad = D.logs.filter(l => l.spoiler_tier > max && l.body && l.body.length > 0);
  if (bad.length) {
    console.warn("[RW][TIER CHECK] public_max超のログ本文が含まれています:",
      bad.map(l => l.log_id).join(", "));
  } else {
    console.info("[RW][TIER CHECK] OK — 全ログ本文は Tier ≤ " + max);
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.RW_UI.init();
  });
})();
