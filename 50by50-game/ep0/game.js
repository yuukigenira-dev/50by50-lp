/* 50by50 Episode 0 Prototype — game.js
   ノード形式シナリオエンジン。台詞はすべて【仮テキスト】。
   node: { bg, l, r, focus:'l'|'r'|null, name, face, text, gauge:±n, choices:[{label,gauge,goto}], goto }
*/

const SPRITES = {
  shade: 'assets/sprite-shade.webp',
  shadeBattle: 'assets/sprite-shade-battle.webp',
  echo: 'assets/sprite-echo.webp',
};
const FACE = (c, e) => `assets/expr/${c}-${e}.webp`;

// ===== 仮シナリオ: 初遭遇（Episode 0 冒頭想定 / 約20ノード） =====
const SCENARIO = [
  { bg:'assets/bg-city.webp', text:'――白い都市は、今夜も静かだった。' },
  { text:'回収対象の信号は、この層で途切れている。任務は単純なはずだった。' },
  { l:SPRITES.shade, focus:'l', name:'泪', face:FACE('shade','neutral'),
    text:'「……信号、消えた」' },
  { name:'泪', face:FACE('shade','neutral'),
    text:'「いや――移された、のか」' },
  { text:'ガラスの反射の向こう。気配よりも先に、声が届いた。' },
  { r:SPRITES.echo, focus:'r', name:'？？？', face:FACE('echo','neutral'),
    text:'「そこまでだ。それは、こちらの回収物だ」' },
  { focus:'l', name:'泪', face:FACE('shade','shaken'),
    text:'「……っ」' },
  { text:'振り向いた先にいたのは――白い髪。淡い光をまとう、敵対組織のエージェント。' },
  { focus:'l', name:'泪', face:FACE('shade','shaken'),
    text:'「（……薫。生きて、いた）」' },
  { focus:'r', name:'？？？', face:FACE('echo','neutral'),
    text:'「なんだ、その顔。……俺と、会ったことでもあるのか」' },
  { focus:'l', name:'泪', face:FACE('shade','anguish'),
    text:'「（覚えていない。……何ひとつ）」' },
  { text:'任務は告げている――敵だ、と。記憶は告げている――違う、と。',
    choices:[
      { label:'武器を構える（任務）', gauge:-12, goto:'mission' },
      { label:'一歩、近づく（感情）', gauge:+12, goto:'emotion' },
    ]},

  // --- 任務ルート ---
  { id:'mission', l:SPRITES.shadeBattle, focus:'l', name:'泪', face:FACE('shade','combat'),
    text:'「……回収対象は渡さない。それだけだ」' },
  { focus:'r', name:'？？？', face:FACE('echo','combat'),
    text:'「そうこなくては。――踊ろうか、星儀社」', goto:'merge' },

  // --- 感情ルート ---
  { id:'emotion', focus:'l', name:'泪', face:FACE('shade','anguish'),
    text:'「……名前は」' },
  { focus:'r', name:'？？？', face:FACE('echo','shaken'),
    text:'「……敵に名乗る名は、ない」' },
  { focus:'r', name:'？？？', face:FACE('echo','shaken'),
    text:'「（……なんだ。この、距離の近さは）」', goto:'merge' },

  // --- 合流 ---
  { id:'merge', text:'夜の底で、ふたつの影が向かい合う。運命だけが、ふたりを敵と呼ぶ。' },
  { text:'――Episode 0、ここから。', end:true },
];

// ===== engine =====
const $ = id => document.getElementById(id);
const screens = { title:$('screenTitle'), game:$('screenGame'), end:$('screenEnd') };
let idx = 0, gauge = 50, typing = null, typeDone = true;

function show(name){
  Object.values(screens).forEach(s => s.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

function setSprite(el, src){
  if (src === undefined) return;            // 変更なし
  if (src === null){ el.classList.remove('is-on'); return; }
  if (el.getAttribute('src') !== src) el.setAttribute('src', src);
  el.classList.add('is-on');
}

function setFocus(focus){
  const L = $('spriteL'), R = $('spriteR');
  L.classList.toggle('is-dim', focus === 'r');
  R.classList.toggle('is-dim', focus === 'l');
  if (!focus){ L.classList.remove('is-dim'); R.classList.remove('is-dim'); }
}

function setGauge(delta){
  if (!delta) return;
  gauge = Math.max(10, Math.min(90, gauge + delta));
  $('gMarker').style.left = gauge + '%';
}

function typeText(t){
  const el = $('dlgText');
  el.textContent = '';
  $('dlgNext').classList.remove('is-on');
  typeDone = false;
  let i = 0;
  clearInterval(typing);
  typing = setInterval(() => {
    el.textContent = t.slice(0, ++i);
    if (i >= t.length){
      clearInterval(typing);
      typeDone = true;
      $('dlgNext').classList.add('is-on');
    }
  }, 34);
}

function render(node){
  if (node.bg) $('gameBg').style.backgroundImage = `url('${node.bg}')`;
  setSprite($('spriteL'), node.l);
  setSprite($('spriteR'), node.r);
  setFocus(node.focus ?? null);
  setGauge(node.gauge);

  const face = $('dlgFace');
  if (node.face){ face.src = node.face; face.classList.add('is-on'); }
  else face.classList.remove('is-on');
  $('dlgName').textContent = node.name || '';

  typeText(node.text);

  const box = $('choices');
  box.innerHTML = '';
  if (node.choices){
    node.choices.forEach(c => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.textContent = c.label;
      b.onclick = (e) => {
        e.stopPropagation();
        box.classList.remove('is-on');
        setGauge(c.gauge);
        jump(c.goto);
      };
      box.appendChild(b);
    });
  }
}

function nodeAt(i){ return SCENARIO[i]; }
function indexOfId(id){ return SCENARIO.findIndex(n => n.id === id); }

function jump(id){
  idx = indexOfId(id);
  render(nodeAt(idx));
}

function advance(){
  const cur = nodeAt(idx);

  // タイプ中なら全文表示
  if (!typeDone){
    clearInterval(typing);
    $('dlgText').textContent = cur.text;
    typeDone = true;
    if (cur.choices) $('choices').classList.add('is-on');
    else $('dlgNext').classList.add('is-on');
    return;
  }
  // 選択肢表示中は進めない
  if (cur.choices){
    $('choices').classList.add('is-on');
    return;
  }
  if (cur.end){ showEnd(); return; }

  if (cur.goto){ jump(cur.goto); return; }
  idx++;
  render(nodeAt(idx));
}

function showEnd(){
  const lean = gauge === 50 ? 'PERFECT 50 : 50'
    : gauge > 50 ? `EMOTION ${gauge} : ${100-gauge} MISSION`
    : `MISSION ${100-gauge} : ${gauge} EMOTION`;
  $('endGauge').textContent = lean;
  show('end');
}

function start(){
  idx = 0; gauge = 50;
  $('gMarker').style.left = '50%';
  show('game');
  render(nodeAt(0));
}

$('btnStart').onclick = start;
$('btnRestart').onclick = () => show('title');
$('btnSkip').onclick = (e) => { e.stopPropagation(); show('title'); };
$('dlgBox').onclick = advance;
$('screenGame').onclick = (e) => {
  if (e.target.closest('.dlg') || e.target.closest('.choices') || e.target.closest('.btn-skip')) return;
  advance();
};
document.addEventListener('keydown', (e) => {
  if (!screens.game.classList.contains('is-active')) return;
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); advance(); }
});
