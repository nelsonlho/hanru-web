// hanru.js — 古代入宿度 <-> 漢朝/現代 座標 轉換
import * as Astronomy from 'astronomy-engine';

const D2R = Math.PI / 180;

// ==================== 28宿距星 座標 ====================
// ra 依《星海詞林》二十八宿數據；dec 沿用常用標準值
export const MANSION_DETERMINATIVES = {
  角: { ra: 188.0, dec: -11.161 }, // α Vir (Spica)
  亢: { ra: 200.0, dec: -9.55 }, // κ Vir
  氐: { ra: 209.0, dec: -16.04 }, // α Lib (Zubenelgenubi)
  房: { ra: 225.0, dec: -19.8 }, // π Sco
  心: { ra: 231.0, dec: -26.43 }, // α Sco (Antares)
  尾: { ra: 237.0, dec: -38.0 }, // μ¹ Sco (近似)
  箕: { ra: 256.0, dec: -30.0 }, // γ Sgr (近似)
  斗: { ra: 266.0, dec: -29.5 }, // φ Sgr
  牛: { ra: 291.0, dec: -14.5 }, // β Cap
  女: { ra: 298.0, dec: -5.0 }, // ε Aqr
  虛: { ra: 309.0, dec: -5.5 }, // β Aqr
  危: { ra: 318.0, dec: -0.5 }, // α Aqr
  室: { ra: 333.0, dec: 15.0 }, // α Peg (Markab)
  壁: { ra: 350.0, dec: 15.0 }, // γ Peg (Algenib)
  奎: { ra: 359.0, dec: 24.0 }, // η And
  婁: { ra: 15.0, dec: 20.5 }, // β Ari (Sheratan)
  胃: { ra: 27.0, dec: 27.0 }, // 35 Ari
  昴: { ra: 42.0, dec: 24.0 }, // 17 Tau
  畢: { ra: 53.0, dec: 19.0 }, // ε Tau (Ain)
  觜: { ra: 70.0, dec: 9.5 }, // λ Ori
  参: { ra: 71.0, dec: -1.5 }, // ζ Ori (Alnitak)
  井: { ra: 81.0, dec: 22.5 }, // μ Gem
  鬼: { ra: 112.0, dec: 21.5 }, // θ Cnc
  柳: { ra: 116.0, dec: -8.5 }, // δ Hya
  星: { ra: 129.0, dec: -8.5 }, // α Hya (Alphard)
  張: { ra: 136.0, dec: -15.0 }, // υ¹ Hya
  翼: { ra: 152.0, dec: -18.5 }, // α Crt (Alkes)
  軫: { ra: 171.0, dec: -17.5 }, // γ Crv (Gienah)
};

// 漢朝古度：周天 365.25 度
const ANCIENT_DEGREES = 365.25;

// 把公元年份轉成 astronomy-engine 的 AstroTime（取該年 1 月 1 日 UTC）
function epochTime(epochYear) {
  return Astronomy.MakeTime(new Date(Date.UTC(epochYear, 0, 1)));
}

// 由赤經/赤緯（度）建立 J2000 單位向量
function vectorFromRaDec(raDeg, decDeg, time) {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  return new Astronomy.Vector(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
    time,
  );
}

// 把 J2000 座標歲差到指定 epoch 的當期赤道座標
function precessJ2000toEpoch(raDeg, decDeg, time) {
  const v = vectorFromRaDec(raDeg, decDeg, time);
  const w = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), v);
  const eq = Astronomy.EquatorFromVector(w); // ra 為「時」單位
  return { ra: (eq.ra * 15 + 360) % 360, dec: eq.dec };
}

// 把某 epoch 當期赤道座標歲差回 J2000
function precessEpochToJ2000(raDeg, decDeg, time) {
  const v = vectorFromRaDec(raDeg, decDeg, time);
  const w = Astronomy.RotateVector(Astronomy.Rotation_EQD_EQJ(time), v);
  const eq = Astronomy.EquatorFromVector(w);
  return { ra: (eq.ra * 15 + 360) % 360, dec: eq.dec };
}

// ==================== 黃道 → 赤道（球面三角，含黃赤交角 ε）====================
// CALC-EX.md 的傳統作法：tan α = (sin λ cos ε − tan β sin ε) / cos λ
// 黃緯 β = 0 時即化簡為 tan α = tan λ × cos ε。
// 注意：λ/β 與輸出 RA/Dec 屬同一春分點（同 epoch）框架。
export function eclipticToEquatorial(lambdaDeg, betaDeg = 0, obliquityDeg = 23.45) {
  const L = lambdaDeg * D2R;
  const B = betaDeg * D2R;
  const E = obliquityDeg * D2R;

  const sinDec = Math.sin(B) * Math.cos(E) + Math.cos(B) * Math.sin(E) * Math.sin(L);
  const dec = Math.asin(sinDec) / D2R;

  const y = Math.sin(L) * Math.cos(E) - Math.tan(B) * Math.sin(E);
  const x = Math.cos(L);
  const ra = ((Math.atan2(y, x) / D2R) + 360) % 360;

  return { ra, dec };
}

// 給定「當期(epoch)赤經」，找所屬宿並算入宿度。
// 距星座標為 J2000，會先歲差到該 epoch 再比較（與黃道輸入的當期框架一致）。
// mansion 留空 = 自動判斷（取該星東側最近的距星，即星所在之宿）。
export function epochRaToHanRudu(raAtEpoch, epochYear = 100, mansion = null) {
  const time = epochTime(epochYear);
  const dets = Object.entries(MANSION_DETERMINATIVES).map(([name, d]) => ({
    name,
    ra: precessJ2000toEpoch(d.ra, d.dec, time).ra,
  }));

  let chosen;
  if (mansion) {
    chosen = dets.find((x) => x.name === mansion);
    if (!chosen) throw new Error(`未知宿名: ${mansion}`);
  } else {
    // 自動：入宿度 = (星赤經 − 距星赤經) 向東為正，取最小非負者
    for (const d of dets) {
      const diff = ((raAtEpoch - d.ra) % 360 + 360) % 360;
      if (!chosen || diff < chosen.diff) chosen = { ...d, diff };
    }
  }

  const delta = ((raAtEpoch - chosen.ra) % 360 + 360) % 360;
  const ancientDu = delta * (ANCIENT_DEGREES / 360);

  return {
    mansion: chosen.name,
    detRaAtEpoch: parseFloat(chosen.ra.toFixed(4)),
    deltaRa: parseFloat(delta.toFixed(4)),
    ancientDu: parseFloat(ancientDu.toFixed(2)),
  };
}

// ==================== 黃經 → 入宿度（CALC-EX.md 全流程）====================
export function eclipticToHanRudu(
  lambdaDeg,
  betaDeg = 0,
  epochYear = 100,
  obliquityDeg = 23.45,
  mansion = null,
) {
  const eq = eclipticToEquatorial(lambdaDeg, betaDeg, obliquityDeg);
  const ru = epochRaToHanRudu(eq.ra, epochYear, mansion || null);

  return {
    lambdaDeg,
    betaDeg,
    obliquityDeg,
    epochYear,
    raAtEpoch: parseFloat(eq.ra.toFixed(4)),
    decAtEpoch: parseFloat(eq.dec.toFixed(4)),
    mansion: ru.mansion,
    detRaAtEpoch: ru.detRaAtEpoch,
    ancientDu: ru.ancientDu,
    note: `黃經 ${lambdaDeg}° (β=${betaDeg}°, ε=${obliquityDeg}°) → 赤經 ${eq.ra.toFixed(2)}° → ${ru.mansion}宿入 ${ru.ancientDu} 古度`,
  };
}

// ==================== 正向：現代(J2000) → 漢朝入宿度 ====================
export function modernToHanRudu(raDeg, decDeg, mansion, epochYear = 100) {
  const det = MANSION_DETERMINATIVES[mansion];
  if (!det) throw new Error(`未知宿名: ${mansion}`);

  const time = epochTime(epochYear);
  const starHan = precessJ2000toEpoch(raDeg, decDeg, time);
  const detHan = precessJ2000toEpoch(det.ra, det.dec, time);

  // 漢代 epoch 下，星相對距星的赤經差（度），以距星東側為正
  let deltaRaHan = (starHan.ra - detHan.ra + 360) % 360;
  if (deltaRaHan > 180) deltaRaHan -= 360; // 取較近一側

  // 轉成古度（入宿度），周天 365.25 度
  const ancientDu = deltaRaHan * (ANCIENT_DEGREES / 360);

  return {
    mansion,
    epochYear,
    ancientDu: parseFloat(ancientDu.toFixed(2)),
    deltaRaHan: parseFloat(deltaRaHan.toFixed(4)),
    starRaAtEpoch: parseFloat(starHan.ra.toFixed(4)),
    detRaAtEpoch: parseFloat(detHan.ra.toFixed(4)),
    note: `以 astronomy-engine 在公元 ${epochYear} 年 epoch 計算（EQJ→EQD 歲差旋轉）`,
  };
}

// ==================== 反向：漢朝入度 → 現代(J2000) 近似赤經 ====================
export function hanRuduToModern(mansion, ancientDu, epochYear = 100) {
  const det = MANSION_DETERMINATIVES[mansion];
  if (!det) throw new Error(`未知宿名: ${mansion}`);

  const time = epochTime(epochYear);

  // 古度 → 當期赤經差（度）
  const deltaRaHan = ancientDu * (360 / ANCIENT_DEGREES);

  // 距星在該 epoch 的當期座標
  const detHan = precessJ2000toEpoch(det.ra, det.dec, time);

  // 目標星在該 epoch 的當期赤經；赤緯未知，近似採用距星的當期赤緯
  const starRaHan = (detHan.ra + deltaRaHan + 360) % 360;
  const j2000 = precessEpochToJ2000(starRaHan, detHan.dec, time);

  return {
    mansion,
    epochYear,
    approximateModernRA: parseFloat(j2000.ra.toFixed(4)),
    approximateModernDec: parseFloat(j2000.dec.toFixed(4)),
    note: '近似值：反推時目標星赤緯未知，暫以距星赤緯代入；如需精確請用正向函數驗證。',
  };
}
