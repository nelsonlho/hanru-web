// QA 匯報測試（2026-07-04）
// 來源：iOS App「七政四餘」作者提供之《星海詞林》二十八宿入宿表，
// 與本網頁（二十八宿轉換儀）入宿度對照。
//
// QA 操作流程（已由重現實驗確認）：
//   1. 黃道分頁：輸入 宮度 換算之黃經（ε=23.45、epoch=100、β=0），
//      抄下頁面顯示的「換算當期赤經/赤緯」。
//   2. 赤道分頁：把該赤經/赤緯填入（頁面視之為 J2000）、指定宿名、epoch=100，
//      得到匯報中的「網頁入宿」值（可為負）。
//
// 三個套件：
//   A. 重現 QA 匯報 —— 鎖住現況數值，證明匯報可完整重現（應恆過）。
//   B. 入宿表期望 —— 宿初度應入宿 0 度；現況必敗，敗即匯報之差異本體。
//      修正資料模型後此套件應轉綠。
//   C. 差異之因 —— 驗證診斷結論（應恆過）。
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  eclipticToHanRudu,
  modernToHanRudu,
  MANSION_DETERMINATIVES,
} from '../src/hanru.js';

// 逆行十二宮 → 黃經基準（丑=270，依 CALC-EX.md「丑宮14度=黃經284」）
const GONG = { 寅: 240, 丑: 270, 子: 300, 亥: 330, 戌: 0, 酉: 30, 申: 60, 未: 90, 午: 120, 巳: 150, 辰: 180, 卯: 210 };
const lambdaOf = (gong, du) => GONG[gong] + du;

const EPOCH = 100;
const OBLIQ = 23.45;

// ==================== QA 匯報原始資料 ====================
// webRa/webDec：QA 抄錄之頁面換算值（有載才填，含 QA 之抄錄誤差，如斗寅26 dec）。
// webRudu：QA 匯報之「網頁入宿」。
const QA_ROWS = [
  { m: '斗', gong: '寅', du: 28, webRudu: 3.05, webRa: 267.8167, webDec: -23.432 },
  { m: '斗', gong: '寅', du: 27, webRudu: 1.98, webRa: 266.7167, webDec: -23.4092 },
  { m: '斗', gong: '寅', du: 26, webRudu: 0.32, webRa: 265.6333, webDec: -26.3673 },
  { m: '觜', gong: '申', du: 12, webRudu: -1.57 },
  { m: '觜', gong: '申', du: 13, webRudu: -0.57, webRa: 71.55, webDec: 22.1786 },
  { m: '参', gong: '申', du: 13, webRudu: -3.31 },
  { m: '井', gong: '申', du: 23, webRudu: 1.19 },
  { m: '鬼', gong: '未', du: 24, webRudu: 3.97 },
  { m: '柳', gong: '未', du: 28, webRudu: -1.23, webRa: 120.1 },
  { m: '星', gong: '午', du: 11, webRudu: 0.22, webRa: 133.45 },
  { m: '張', gong: '午', du: 18, webRudu: -0.14, webRa: 140.4333, webDec: 14.6837 },
];

// 入宿表所載各宿初度（宿界）
const TABLE_BOUNDARY = [
  { m: '斗', gong: '寅', du: 28 },
  { m: '觜', gong: '申', du: 12 },
  { m: '参', gong: '申', du: 13 },
  { m: '井', gong: '申', du: 23 },
  { m: '鬼', gong: '未', du: 24 },
  { m: '柳', gong: '未', du: 28 },
  { m: '星', gong: '午', du: 11 },
  { m: '張', gong: '午', du: 18 },
];

// 依 QA 流程算出「網頁入宿」：優先用 QA 抄錄之 ra/dec，缺者以黃道分頁換算補齊。
function webRuduViaQaFlow(row) {
  const ecl = eclipticToHanRudu(lambdaOf(row.gong, row.du), 0, EPOCH, OBLIQ, row.m);
  const ra = row.webRa ?? ecl.raAtEpoch;
  const dec = row.webDec ?? ecl.decAtEpoch;
  return modernToHanRudu(ra, dec, row.m, EPOCH).ancientDu;
}

// ==================== A. 重現 QA 匯報 ====================
describe('A. 重現 QA 匯報（現況鎖定，應恆過）', () => {
  for (const row of QA_ROWS) {
    const exact = row.webRa != null && row.webDec != null;
    // QA 有完整抄錄 ra/dec 者可精確重現（±0.01）；
    // 缺 dec 者以換算值補，容差放寬至 ±0.15（QA 手抄精度）。
    const tol = exact ? 0.01 : 0.15;
    test(`${row.m} 表${row.gong}${row.du}° → 網頁入宿 ${row.webRudu}（±${tol}）`, () => {
      const got = webRuduViaQaFlow(row);
      assert.ok(
        Math.abs(got - row.webRudu) <= tol,
        `重現值 ${got} ≠ QA 匯報 ${row.webRudu}（差 ${(got - row.webRudu).toFixed(2)}）`,
      );
    });
  }
});

// ==================== B. 入宿表期望（現況必敗 = 匯報之差異）====================
describe('B. 入宿表期望：宿初度應入宿 0 度（待修，現況紅）', () => {
  for (const b of TABLE_BOUNDARY) {
    const lambda = lambdaOf(b.gong, b.du);

    test(`${b.m} 初度（${b.gong}${b.du}° λ=${lambda}）黃道分頁指定宿 → 入宿 ≈ 0 古度`, () => {
      const r = eclipticToHanRudu(lambda, 0, EPOCH, OBLIQ, b.m);
      assert.ok(
        Math.abs(r.ancientDu) <= 0.3,
        `入宿 ${r.ancientDu} 古度，應 ≈ 0（宿初度）`,
      );
    });

    test(`${b.m} 初度（λ=${lambda}）黃道分頁自動判斷 → 應判為 ${b.m} 宿`, () => {
      const r = eclipticToHanRudu(lambda, 0, EPOCH, OBLIQ, null);
      assert.equal(r.mansion, b.m, `自動判斷為 ${r.mansion}，應為 ${b.m}`);
    });
  }
});

// ==================== C. 差異之因（診斷結論，應恆過）====================
describe('C. 差異之因', () => {
  test('因一：星海詞林值實為黃道宿界（黃經），非赤經 —— 表初度λ − 星海值 恆等於 2°', () => {
    for (const b of TABLE_BOUNDARY) {
      const diff = lambdaOf(b.gong, b.du) - MANSION_DETERMINATIVES[b.m].ra;
      assert.equal(diff, 2, `${b.m}: 表λ ${lambdaOf(b.gong, b.du)} − 星海 ${MANSION_DETERMINATIVES[b.m].ra} = ${diff}，非 2`);
    }
  });

  test('因二：黃道分頁指定宿 全面偏 +26~34 古度 —— 距星被當 J2000 再歲差（雙重歲差）', () => {
    for (const b of TABLE_BOUNDARY) {
      const r = eclipticToHanRudu(lambdaOf(b.gong, b.du), 0, EPOCH, OBLIQ, b.m);
      assert.ok(
        r.ancientDu > 24 && r.ancientDu < 34,
        `${b.m}: 黃道分頁入宿 ${r.ancientDu} 古度，偏移不在 24~34 區間（診斷失準）`,
      );
    }
  });

  test('因三：赤道分頁殘差 ±4° 隨 dec 漂移 —— dec 異源（今世值）滲入歲差旋轉', () => {
    // 同一赤經、不同 dec，入宿度可差 5 古度以上（柳宿實測）：
    const a = modernToHanRudu(120.1, 20.57, '柳', EPOCH).ancientDu; // QA 換算 dec
    const c = modernToHanRudu(120.1, -8.5, '柳', EPOCH).ancientDu; // 程式距星 dec
    assert.ok(Math.abs(a - c) > 5, `dec 敏感度僅 ${Math.abs(a - c).toFixed(2)} 古度，診斷失準`);
  });
});
