import {
  MANSION_DETERMINATIVES,
  modernToHanRudu,
  hanRuduToModern,
  eclipticToHanRudu,
} from './hanru.js';

const mansions = Object.keys(MANSION_DETERMINATIVES);

// ==================== 星空背景 ====================

(function buildStarfield() {
  const field = document.getElementById('starfield');
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 140; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    const size = Math.random() < 0.85 ? Math.random() * 1.4 + 0.6 : Math.random() * 2 + 1.6;
    s.style.width = `${size.toFixed(2)}px`;
    s.style.height = s.style.width;
    s.style.left = `${(Math.random() * 100).toFixed(2)}%`;
    s.style.top = `${(Math.random() * 100).toFixed(2)}%`;
    s.style.setProperty('--tw', `${(Math.random() * 4 + 2.5).toFixed(2)}s`);
    s.style.setProperty('--td', `${(Math.random() * -6).toFixed(2)}s`);
    s.style.setProperty('--o0', (Math.random() * 0.2 + 0.05).toFixed(2));
    s.style.setProperty('--o1', (Math.random() * 0.5 + 0.4).toFixed(2));
    frag.appendChild(s);
  }
  field.appendChild(frag);
})();

// ==================== 分頁切換 ====================

const tabs = [...document.querySelectorAll('.tab')];
const indicator = document.querySelector('.tab-indicator');
const panelToMansionSelect = {
  'panel-fwd': 'fwd-mansion',
  'panel-ecl': 'ecl-mansion',
  'panel-rev': 'rev-mansion',
};
let activePanel = 'panel-fwd';

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    indicator.style.transform = `translateX(${i * 100}%)`;
    for (const id of Object.keys(panelToMansionSelect)) {
      const panel = document.getElementById(id);
      const on = id === tab.dataset.panel;
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    }
    activePanel = tab.dataset.panel;
    // 切換分頁時，星盤同步顯示該分頁目前選的宿
    const sel = document.getElementById(panelToMansionSelect[activePanel]);
    if (sel.value) setDialActive(sel.value);
  });
});

// ==================== 二十八宿星盤 ====================

const SVG_NS = 'http://www.w3.org/2000/svg';
const DIAL = { cx: 170, cy: 170, arcR: 128, labelR: 152, gapDeg: 1.6 };

function polar(raDeg, r) {
  const th = ((raDeg - 90) * Math.PI) / 180;
  return [DIAL.cx + r * Math.cos(th), DIAL.cy + r * Math.sin(th)];
}

function svgEl(tag, attrs, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}

const dialSegs = new Map(); // 宿名 -> <g>
let dialCenterChar, dialCenterSub;

(function buildDial() {
  const svg = document.getElementById('mansion-dial');

  // 底環與十字準線
  svg.appendChild(svgEl('circle', { class: 'dial-ring', cx: DIAL.cx, cy: DIAL.cy, r: DIAL.arcR }));
  svg.appendChild(svgEl('circle', { class: 'dial-ring', cx: DIAL.cx, cy: DIAL.cy, r: 62 }));
  for (const a of [0, 90]) {
    const [x1, y1] = polar(a, DIAL.arcR);
    const [x2, y2] = polar(a + 180, DIAL.arcR);
    svg.appendChild(svgEl('line', { class: 'dial-cross', x1, y1, x2, y2 }));
  }

  // 依 J2000 赤經排序，弧長即兩距星間的赤經差（宿的今度寬）
  const sorted = mansions
    .map((name) => ({ name, ra: MANSION_DETERMINATIVES[name].ra }))
    .sort((a, b) => a.ra - b.ra);

  sorted.forEach((m, i) => {
    const next = sorted[(i + 1) % sorted.length];
    const span = (next.ra - m.ra + 360) % 360;
    const gap = Math.min(DIAL.gapDeg, span / 4); // 窄宿（如觜，寬約 1°）防弧線反轉
    const a1 = m.ra + gap;
    const a2 = m.ra + span - gap;
    const [x1, y1] = polar(a1, DIAL.arcR);
    const [x2, y2] = polar(a2, DIAL.arcR);
    const large = span - 2 * gap > 180 ? 1 : 0;

    const g = svgEl('g', { class: 'seg' });
    g.appendChild(
      svgEl('path', {
        class: 'seg-arc',
        d: `M ${x1} ${y1} A ${DIAL.arcR} ${DIAL.arcR} 0 ${large} 1 ${x2} ${y2}`,
      }),
    );
    const [sx, sy] = polar(m.ra, DIAL.arcR);
    g.appendChild(svgEl('circle', { class: 'seg-star', cx: sx, cy: sy, r: 2.2 }));
    const [lx, ly] = polar(m.ra + span / 2, DIAL.labelR);
    g.appendChild(svgEl('text', { class: 'seg-label', x: lx, y: ly }, m.name));

    g.addEventListener('click', () => {
      const sel = document.getElementById(panelToMansionSelect[activePanel]);
      sel.value = m.name;
      setDialActive(m.name);
    });
    dialSegs.set(m.name, g);
    svg.appendChild(g);
  });

  // 中央顯示
  dialCenterChar = svgEl('text', { class: 'dial-center-char', x: DIAL.cx, y: DIAL.cy - 4 }, '宿');
  dialCenterSub = svgEl(
    'text',
    { class: 'dial-center-sub', x: DIAL.cx, y: DIAL.cy + 34 },
    '二十八宿',
  );
  svg.appendChild(dialCenterChar);
  svg.appendChild(dialCenterSub);
})();

function setDialActive(name, subText) {
  for (const [n, g] of dialSegs) g.classList.toggle('active', n === name);
  if (dialSegs.has(name)) {
    dialCenterChar.textContent = name;
    dialCenterSub.textContent = subText ?? `${name} 宿`;
  }
}

// ==================== 表單 ====================

// 填充宿名下拉選單（ecl-mansion 已有「自動判斷」選項，附加於其後）
for (const id of ['fwd-mansion', 'rev-mansion', 'ecl-mansion']) {
  const sel = document.getElementById(id);
  for (const m of mansions) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    if (sel.value) setDialActive(sel.value);
  });
}
document.getElementById('fwd-mansion').value = '角';
document.getElementById('rev-mansion').value = '角';
setDialActive('角');

const num = (id) => parseFloat(document.getElementById(id).value);
const deg = (v) => `${v}°`;

// 以友善的中文排版顯示結果
function render(id, { headline, rows, note }) {
  const el = document.getElementById(id);
  el.classList.remove('error');
  el.innerHTML = `
    <div class="result-headline">${headline}</div>
    <dl class="result-rows">
      ${rows.map((r) => `<dt>${r.label}</dt><dd>${r.value}</dd>`).join('')}
    </dl>
    ${note ? `<p class="result-note">${note}</p>` : ''}
  `;
  // 重新觸發浮現動畫
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = '';
}

function renderError(id, e) {
  const el = document.getElementById(id);
  el.classList.add('error');
  el.innerHTML = `⚠️ ${e?.message ?? e}`;
}

// 正向：現代座標 → 入宿度
document.getElementById('fwd-btn').addEventListener('click', () => {
  try {
    const r = modernToHanRudu(
      num('fwd-ra'),
      num('fwd-dec'),
      document.getElementById('fwd-mansion').value,
      num('fwd-epoch'),
    );
    render('fwd-out', {
      headline: `${r.mansion}宿　入宿 <strong>${r.ancientDu}</strong> 古度`,
      rows: [
        { label: '漢代赤經差', value: deg(r.deltaRaHan) },
        { label: '星·漢代赤經', value: deg(r.starRaAtEpoch) },
        { label: '距星·漢代赤經', value: deg(r.detRaAtEpoch) },
        { label: '採用曆元', value: `公元 ${r.epochYear} 年` },
      ],
      note: r.note,
    });
    setDialActive(r.mansion, `入宿 ${r.ancientDu} 度`);
  } catch (e) {
    renderError('fwd-out', e);
  }
});

// 黃道輸入（CALC-EX.md 流程）
document.getElementById('ecl-btn').addEventListener('click', () => {
  try {
    const r = eclipticToHanRudu(
      num('ecl-lambda'),
      num('ecl-beta'),
      num('ecl-epoch'),
      num('ecl-obliq'),
      document.getElementById('ecl-mansion').value || null,
    );
    render('ecl-out', {
      headline: `${r.mansion}宿　入宿 <strong>${r.ancientDu}</strong> 古度`,
      rows: [
        { label: '黃經 λ', value: deg(r.lambdaDeg) },
        { label: '黃緯 β', value: deg(r.betaDeg) },
        { label: '黃赤交角 ε', value: deg(r.obliquityDeg) },
        { label: '換算當期赤經', value: deg(r.raAtEpoch) },
        { label: '換算當期赤緯', value: deg(r.decAtEpoch) },
        { label: '宿首赤經（表值）', value: deg(r.detRaAtEpoch) },
        { label: '採用曆元', value: `公元 ${r.epochYear} 年` },
      ],
      note: `黃經 ${r.lambdaDeg}° 經黃赤交角換算為赤經 ${r.raAtEpoch}°，落在 ${r.mansion} 宿（宿界依《星海詞林》入宿表，定界不歲差）。`,
    });
    setDialActive(r.mansion, `入宿 ${r.ancientDu} 度`);
  } catch (e) {
    renderError('ecl-out', e);
  }
});

// 反向：入宿度 → 現代近似赤經
document.getElementById('rev-btn').addEventListener('click', () => {
  try {
    const r = hanRuduToModern(
      document.getElementById('rev-mansion').value,
      num('rev-du'),
      num('rev-epoch'),
    );
    render('rev-out', {
      headline: `現代赤經約 <strong>${r.approximateModernRA}°</strong>`,
      rows: [
        { label: '近似現代赤緯', value: deg(r.approximateModernDec) },
        { label: '所屬宿', value: `${r.mansion} 宿` },
        { label: '採用曆元', value: `公元 ${r.epochYear} 年` },
      ],
      note: '反推時目標星赤緯未知，暫以距星赤緯代入，故為近似值。',
    });
    setDialActive(r.mansion, `赤經 ${r.approximateModernRA}°`);
  } catch (e) {
    renderError('rev-out', e);
  }
});
