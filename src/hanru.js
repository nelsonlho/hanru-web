// hanru.js — 古代入宿度 <-> 漢朝/現代 座標 轉換
import * as Astronomy from 'astronomy-engine';

const D2R = Math.PI / 180;

// ==================== 28宿 宿首（入宿 0 度點）座標 ====================
// 依 iOS App「七政四餘」作者提供之《星海詞林》二十八宿入宿表（2026-07 QA 對照定案）。
// ra/dec 為該表所載宿首赤經/赤緯（現代框架，與表列黃經 λ 同源）；
// 註解記表列宮度與黃經。表列「宿1°」即宿首（入宿第一度之起點，本碼 0 基）。
// 星宿赤緯表未載，依對徑（λ 差 180°，表值嚴格反號：翼/室、女/柳 可驗）取虛宿值反號補之。
export const MANSION_DETERMINATIVES = {
  角: { ra: 189.1833, dec: -3.6413 }, // 表辰10° λ190
  亢: { ra: 200.3167, dec: -7.9517 }, // 表辰22° λ202
  氐: { ra: 208.85, dec: -11.0705 }, // 表卯1° λ211
  房: { ra: 224.5167, dec: -16.201 }, // 表卯17° λ227
  心: { ra: 230.5833, dec: -17.9047 }, // 表卯23° λ233
  尾: { ra: 236.7667, dec: -19.4426 }, // 表卯29° λ239
  箕: { ra: 256.95, dec: -22.8097 }, // 表寅18° λ258
  斗: { ra: 267.8167, dec: -23.432 }, // 表寅28° λ268
  牛: { ra: 294.8333, dec: -21.1709 }, // 表丑23° λ293
  女: { ra: 301.0167, dec: -19.9408 }, // 表丑29° λ299
  虛: { ra: 313.45, dec: -16.7922 }, // 表子11° λ311
  危: { ra: 322.4167, dec: -14.0641 }, // 表子20° λ320
  室: { ra: 336.8333, dec: -9.007 }, // 表亥5° λ335
  壁: { ra: 352.65, dec: -2.9182 }, // 表亥22° λ352
  奎: { ra: 0.9167, dec: 0.3648 }, // 表戌1° λ1
  婁: { ra: 15.65, dec: 6.1626 }, // 表戌17° λ17
  胃: { ra: 26.9333, dec: 10.3845 }, // 表戌29° λ29
  昴: { ra: 41.5167, dec: 15.2942 }, // 表酉14° λ44
  畢: { ra: 52.6233, dec: 18.4379 }, // 表酉25° λ55
  觜: { ra: 70.4833, dec: 22.0575 }, // 表申12° λ72
  参: { ra: 71.55, dec: 22.1786 }, // 表申13° λ73
  井: { ra: 82.3667, dec: 23.2299 }, // 表申23° λ83
  鬼: { ra: 115.8833, dec: 20.9792 }, // 表未24° λ114
  柳: { ra: 120.1, dec: 20.1382 }, // 表未28° λ118
  星: { ra: 133.45, dec: 16.7922 }, // 表午11° λ131（dec 補值，見上）
  張: { ra: 140.4333, dec: 14.6837 }, // 表午18° λ138
  翼: { ra: 155.9, dec: 9.3517 }, // 表巳4° λ154
  軫: { ra: 173.5667, dec: 2.5556 }, // 表巳23° λ173
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

// 宿首換算容差：表列黃經經 ε 換算之赤經與表列宿首赤經有 ≤0.03° 微差
// （表作者所用 ε 與本頁預設 23.45 略異），宿界判定時視為同點，
// 免得輸入恰為宿首之位置被判入前一宿。
const BOUNDARY_EPS = 0.05;

// 給定赤經（與宿首表同框架，即現代/表列框架），找所屬宿並算入宿度。
// 宿首即《星海詞林》表值，為定界，不隨 epoch 歲差（epochYear 僅供回報顯示）。
// mansion 留空 = 自動判斷（取該星西側最近的宿首，即星所在之宿）。
export function epochRaToHanRudu(raAtEpoch, epochYear = 100, mansion = null) {
  const dets = Object.entries(MANSION_DETERMINATIVES).map(([name, d]) => ({
    name,
    ra: d.ra,
  }));

  let chosen;
  if (mansion) {
    chosen = dets.find((x) => x.name === mansion);
    if (!chosen) throw new Error(`未知宿名: ${mansion}`);
  } else {
    // 自動：入宿度 = (星赤經 − 宿首赤經) 向東為正，取最小非負者
    for (const d of dets) {
      let diff = ((raAtEpoch - d.ra) % 360 + 360) % 360;
      if (diff >= 360 - BOUNDARY_EPS) diff = 0;
      if (!chosen || diff < chosen.diff) chosen = { ...d, diff };
    }
  }

  let delta = ((raAtEpoch - chosen.ra) % 360 + 360) % 360;
  if (delta > 180) delta -= 360; // 指定宿名時允許負值（星在宿首西側）
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

// ==================== 正向：現代赤道座標 → 入宿度 ====================
// 輸入與宿首表同視為 J2000 框架；星與宿首同受歲差旋轉，
// epoch 只帶入兩者間的差動歲差（同點輸入時恆為 0，任一 epoch 皆合表）。
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
