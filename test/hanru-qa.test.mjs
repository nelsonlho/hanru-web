// QA 驗收測試（2026-07-07 修正後）
// 來源：iOS App「七政四餘」作者提供之《星海詞林》二十八宿入宿表。
// 歷史：2026-07-04 QA 匯報各宿宿首入宿度偏差 −3.3 ~ +4.0 古度；
//   診斷為（一）MANSION_DETERMINATIVES 與入宿表宿首不符、
//   （二）黃道分頁對宿首重複歲差（偏 +25~33 古度）。
//   2026-07-07 修正：宿首改採表列赤經/赤緯，黃道分頁宿界定界不歲差。
//
// 驗收準則（依 QA 操作流程）：
//   A. 赤道分頁：輸入表列宿首赤經/赤緯 → 入宿 0（QA 即此流程）。
//   B. 黃道分頁：輸入表列黃經（ε=23.45、β=0）→ 入宿 ≈ 0，
//      殘差僅來自表作者所用 ε 與 23.45 之微異（≤0.15 古度）。
//   C. 黃道分頁自動判斷：宿首位置應判為本宿。
//   D. 反向與正向互逆。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  eclipticToHanRudu,
  modernToHanRudu,
  hanRuduToModern,
  MANSION_DETERMINATIVES,
} from '../src/hanru.js';

// 逆行十二宮 → 黃經基準（丑=270，依 CALC-EX.md「丑宮14度=黃經284」）
const GONG = { 寅: 240, 丑: 270, 子: 300, 亥: 330, 戌: 0, 酉: 30, 申: 60, 未: 90, 午: 120, 巳: 150, 辰: 180, 卯: 210 };
const lambdaOf = (gong, du) => GONG[gong] + du;

const OBLIQ = 23.45;

// ==================== 入宿表全 28 宿宿首 ====================
// gong/du：表列宮度；ra/dec：表列宿首赤經/赤緯（星 dec 為對徑補值）。
const TABLE = [
  { m: '角', gong: '辰', du: 10 },
  { m: '亢', gong: '辰', du: 22 },
  { m: '氐', gong: '卯', du: 1 },
  { m: '房', gong: '卯', du: 17 },
  { m: '心', gong: '卯', du: 23 },
  { m: '尾', gong: '卯', du: 29 },
  { m: '箕', gong: '寅', du: 18 },
  { m: '斗', gong: '寅', du: 28 },
  { m: '牛', gong: '丑', du: 23 },
  { m: '女', gong: '丑', du: 29 },
  { m: '虛', gong: '子', du: 11 },
  { m: '危', gong: '子', du: 20 },
  { m: '室', gong: '亥', du: 5 },
  { m: '壁', gong: '亥', du: 22 },
  { m: '奎', gong: '戌', du: 1 },
  { m: '婁', gong: '戌', du: 17 },
  { m: '胃', gong: '戌', du: 29 },
  { m: '昴', gong: '酉', du: 14 },
  { m: '畢', gong: '酉', du: 25 },
  { m: '觜', gong: '申', du: 12 },
  { m: '参', gong: '申', du: 13 },
  { m: '井', gong: '申', du: 23 },
  { m: '鬼', gong: '未', du: 24 },
  { m: '柳', gong: '未', du: 28 },
  { m: '星', gong: '午', du: 11 },
  { m: '張', gong: '午', du: 18 },
  { m: '翼', gong: '巳', du: 4 },
  { m: '軫', gong: '巳', du: 23 },
];

// ==================== A. 赤道分頁：表列宿首座標 → 入宿 0 ====================
describe('A. 赤道分頁：宿首赤經/赤緯 → 入宿 0 古度（QA 流程，任一 epoch）', () => {
  for (const { m } of TABLE) {
    const det = MANSION_DETERMINATIVES[m];
    for (const epoch of [100, 2000]) {
      test(`${m} 宿首（ra=${det.ra}, dec=${det.dec}）epoch=${epoch} → 0`, () => {
        const got = modernToHanRudu(det.ra, det.dec, m, epoch).ancientDu;
        assert.ok(Math.abs(got) <= 0.01, `入宿 ${got} 古度，應為 0`);
      });
    }
  }
});

// ==================== B. 黃道分頁：表列黃經 → 入宿 ≈ 0 ====================
describe('B. 黃道分頁：宿首黃經 → 入宿 ≈ 0 古度', () => {
  for (const b of TABLE) {
    const lambda = lambdaOf(b.gong, b.du);
    test(`${b.m} 宿首（${b.gong}${b.du}° λ=${lambda}）→ |入宿| ≤ 0.15`, () => {
      const r = eclipticToHanRudu(lambda, 0, 100, OBLIQ, b.m);
      assert.ok(
        Math.abs(r.ancientDu) <= 0.15,
        `入宿 ${r.ancientDu} 古度，應 ≈ 0（宿首）`,
      );
    });
  }
});

// ==================== C. 黃道分頁自動判斷 ====================
describe('C. 黃道分頁自動判斷：宿首位置應判為本宿', () => {
  for (const b of TABLE) {
    const lambda = lambdaOf(b.gong, b.du);
    test(`${b.m}（λ=${lambda}）自動判斷 → ${b.m}`, () => {
      const r = eclipticToHanRudu(lambda, 0, 100, OBLIQ, null);
      assert.equal(r.mansion, b.m, `自動判斷為 ${r.mansion}，應為 ${b.m}`);
    });
  }
});

// ==================== D. 反向 ↔ 正向互逆 ====================
describe('D. 反向（入宿度→赤經）與正向互逆', () => {
  for (const [m, du] of [['角', 5], ['斗', 17.65], ['觜', 0.5], ['軫', 10]]) {
    test(`${m} 入宿 ${du} 古度 → 赤經 → 入宿 ${du}`, () => {
      const rev = hanRuduToModern(m, du, 100);
      const fwd = modernToHanRudu(rev.approximateModernRA, rev.approximateModernDec, m, 100);
      assert.ok(Math.abs(fwd.ancientDu - du) <= 0.02, `回程 ${fwd.ancientDu} ≠ ${du}`);
    });
  }
});

// ==================== E. CALC-EX.md 古例 ====================
describe('E. CALC-EX.md 例：紫炁 丑宮14度（λ=284）', () => {
  test('黃道分頁 → 斗宿，入宿落在第 18 古度（17~18）', () => {
    const r = eclipticToHanRudu(284, 0, 100, OBLIQ, null);
    assert.equal(r.mansion, '斗');
    assert.ok(
      r.ancientDu >= 17 && r.ancientDu < 18,
      `入宿 ${r.ancientDu}，例載「斗木18度」應在 [17,18)`,
    );
  });
});
