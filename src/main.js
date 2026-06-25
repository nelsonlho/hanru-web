import {
  MANSION_DETERMINATIVES,
  modernToHanRudu,
  hanRuduToModern,
  eclipticToHanRudu,
} from './hanru.js';

const mansions = Object.keys(MANSION_DETERMINATIVES);

// 填充宿名下拉選單（ecl-mansion 已有「自動判斷」選項，附加於其後）
for (const id of ['fwd-mansion', 'rev-mansion', 'ecl-mansion']) {
  const sel = document.getElementById(id);
  for (const m of mansions) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  }
}
document.getElementById('fwd-mansion').value = '角';
document.getElementById('rev-mansion').value = '角';

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
        { label: '距星·當期赤經', value: deg(r.detRaAtEpoch) },
        { label: '採用曆元', value: `公元 ${r.epochYear} 年` },
      ],
      note: `黃經 ${r.lambdaDeg}° 經黃赤交角換算為赤經 ${r.raAtEpoch}°，落在 ${r.mansion} 宿。`,
    });
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
  } catch (e) {
    renderError('rev-out', e);
  }
});
