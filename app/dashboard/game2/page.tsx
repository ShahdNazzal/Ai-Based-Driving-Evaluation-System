

"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   Sound Engine — Web Audio API
   ═══════════════════════════════════════════════════════════════ */
class SoundEngine {
  ctx: AudioContext | null = null;
  engOsc: OscillatorNode | null = null;
  engGain: GainNode | null = null;
  lastColl = 0;
  _muted = false;
  // Ocean sound nodes
  oceanGain: GainNode | null = null;
  oceanNoise: AudioBufferSourceNode | null = null;
  oceanLFO: OscillatorNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.engOsc = this.ctx.createOscillator();
      this.engGain = this.ctx.createGain();
      this.engOsc.type = "sawtooth";
      this.engOsc.frequency.value = 75;
      this.engGain.gain.value = 0;
      const flt = this.ctx.createBiquadFilter();
      flt.type = "lowpass"; flt.frequency.value = 280;
      this.engOsc.connect(flt); flt.connect(this.engGain);
      this.engGain.connect(this.ctx.destination);
      this.engOsc.start();
    } catch (e) {}
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
  setMuted(m: boolean) { this._muted = m; if (m) { this.stopEngine(); this.stopOcean(); } }
  get muted() { return this._muted; }

  updateEngine(spd: number) {
    if (!this.engOsc || !this.engGain || !this.ctx || this._muted) return;
    this.engOsc.frequency.value = 75 + spd * 12;
    this.engGain.gain.value = Math.min(spd * 0.022, 0.1);
  }
  stopEngine() { if (this.engGain) this.engGain.gain.value = 0; }

  startOcean() {
    if (!this.ctx || this._muted || this.oceanGain) return;
    try {
      this.resume();
      const c = this.ctx;
      const bufLen = c.sampleRate * 4;
      const buf = c.createBuffer(1, bufLen, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      this.oceanNoise = c.createBufferSource();
      this.oceanNoise.buffer = buf;
      this.oceanNoise.loop = true;

      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 400;
      filter.Q.value = 0.5;

      const filter2 = c.createBiquadFilter();
      filter2.type = "lowpass";
      filter2.frequency.value = 800;

      this.oceanLFO = c.createOscillator();
      this.oceanLFO.frequency.value = 0.12;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 200;
      this.oceanLFO.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.oceanLFO.start();

      this.oceanGain = c.createGain();
      this.oceanGain.gain.value = 0;
      this.oceanNoise.connect(filter);
      filter.connect(filter2);
      filter2.connect(this.oceanGain);
      this.oceanGain.connect(c.destination);
      this.oceanNoise.start();

      // Fade in
      this.oceanGain.gain.linearRampToValueAtTime(0.18, c.currentTime + 2);
    } catch (e) {}
  }

  stopOcean() {
    try {
      if (this.oceanGain && this.ctx) {
        this.oceanGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        setTimeout(() => {
          try { this.oceanNoise?.stop(); } catch (e) {}
          try { this.oceanLFO?.stop(); } catch (e) {}
          this.oceanGain = null; this.oceanNoise = null; this.oceanLFO = null;
        }, 1200);
      }
    } catch (e) {}
  }

  _buf(dur: number, vol: number) {
    if (!this.ctx || this._muted) return null;
    this.resume();
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * vol;
    return b;
  }
  playBrake() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const b = this._buf(0.1, 0.5); if (!b) return;
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
      const g = c.createGain(); g.gain.value = 0.12;
      s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
  }
  playIndicator() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 950; o.type = "sine";
      g.gain.value = 0.1; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.035);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.035);
    } catch (e) {}
  }
  playCollision() {
    const c = this.ctx; if (!c || this._muted) return;
    const now = Date.now(); if (now - this.lastColl < 250) return; this.lastColl = now;
    this.resume();
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 50; o.type = "sine";
      g.gain.value = 0.3; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.22);
      const b = this._buf(0.12, 1); if (b) {
        const s = c.createBufferSource(); s.buffer = b;
        const ng = c.createGain(); ng.gain.value = 0.2;
        s.connect(ng); ng.connect(c.destination); s.start();
      }
    } catch (e) {}
  }
  playHorn() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 360; o.type = "square";
      g.gain.value = 0.1; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35);
    } catch (e) {}
  }
  playWarning() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const t = c.currentTime;
      [660, 900].forEach((fr, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = fr; o.type = "sine";
        g.gain.setValueAtTime(0.16, t + i * 0.11);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.09);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.09);
      });
    } catch (e) {}
  }
  playSuccess() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const t = c.currentTime;
      [523, 659, 784].forEach((fr, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = fr; o.type = "triangle";
        g.gain.setValueAtTime(0.18, t + i * 0.14);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.28);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.28);
      });
    } catch (e) {}
  }
  playFail() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const t = c.currentTime;
      [400, 340, 260].forEach((fr, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = fr; o.type = "sine";
        g.gain.setValueAtTime(0.18, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.28);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.28);
      });
    } catch (e) {}
  }
  playParkChime() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const t = c.currentTime;
      [880, 1047, 1319].forEach((fr, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = fr; o.type = "sine";
        g.gain.setValueAtTime(0.13, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.18);
        o.connect(g); g.connect(c.destination);
        o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.18);
      });
    } catch (e) {}
  }
  playTick() {
    const c = this.ctx; if (!c || this._muted) return; this.resume();
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 1200; o.type = "sine";
      g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.02);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.02);
    } catch (e) {}
  }
  destroy() {
    try { if (this.engOsc) this.engOsc.stop(); } catch (e) {}
    this.stopOcean();
    try { if (this.ctx) this.ctx.close(); } catch (e) {}
    this.ctx = null; this.engOsc = null; this.engGain = null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
type ScoreKey =
  | "seat_adjust" | "mirror_adjust" | "seatbelt" | "start_observe" | "driver_behavior"
  | "gear_use" | "road_conditions" | "steering_control" | "positioning"
  | "indicator_use" | "lane_keeping" | "turn_selection" | "sign_compliance"
  | "traffic_attention" | "ground_marks" | "intersections" | "indicator_procedure"
  | "overtake_timing" | "overtake_signal" | "overtake_monitor" | "overtake_return"
  | "normal_stop" | "sudden_stop" | "intersection_gap" | "stop_signs"
  | "pedestrians" | "vehicles" | "road_env" | "obstacles"
  | "parking_safe" | "reverse_look" | "reverse_monitor" | "parking_align";
type GamePhase = "idle" | "selectEnv" | "selectCar" | "playing" | "parking" | "finished";
type EnvId = "amman" | "irbid" | "aqaba" | "petra";

interface ScoreItem { key: ScoreKey; label: string; max: number; section: number; }
interface CrossCar { id: number; x: number; y: number; w: number; h: number; speed: number; color: string; }
interface Intersection {
  id: number; y: number; width: number; lightState: "red" | "green" | "yellow";
  lightTimer: number; cycleDuration: number; crossTraffic: CrossCar[];
  scored: boolean; violated: boolean; approached: boolean; lastSpawn: number;
}
// Roundabout (دوار)
interface Roundabout {
  id: number; y: number; cx: number; cy: number; outerR: number; innerR: number;
  circCars: CircCar[]; scored: boolean; entered: boolean; yielded: boolean;
  lastSpawn: number; spawnTimer: number;
}
interface CircCar {
  id: number; angle: number; speed: number; r: number; w: number; h: number; color: string;
}
interface Bldg { y: number; side: "L" | "R"; label: string; sub: string; w: number; h: number; color: string; awc: string; hasAw: boolean; type: string; }
interface Obs { id: number; kind: string; x: number; y: number; w: number; h: number; vy: number; vx: number; active: boolean; hit: boolean; scored: boolean; data?: any; }
interface TreeO { x: number; y: number; scale: number; type: string; }
interface Ptc { x: number; y: number; vx: number; vy: number; life: number; ml: number; color: string; size: number; }
interface RMark { y: number; type: string; }
interface GovS { x: number; y: number; dest: string; km: number; side: string; }
interface PZone { x: number; y: number; w: number; h: number; timer: number; confirmed: boolean; alignQ: number; }
interface Landmark { y: number; kind: string; side: "L" | "R"; }
// Ocean wave
interface OceanWave { offset: number; speed: number; amp: number; y: number; }

interface GS {
  px: number; py: number; pw: number; ph: number;
  speed: number; targetLane: number; currentLane: number;
  lcT: number; lcIng: boolean;
  lb: boolean; rb: boolean; bt: number;
  roadOff: number; bgOff: number; dist: number;
  inters: Intersection[]; roundabouts: Roundabout[];
  obs: Obs[]; trees: TreeO[];
  lights: { x: number; y: number }[]; bldgs: Bldg[]; rms: RMark[];
  ptcs: Ptc[]; govs: GovS[]; landmarks: Landmark[];
  oceanWaves: OceanWave[];
  niDist: number; noDist: number; nbDist: number; ntDist: number; nlDist: number; nrDist: number;
  offRT: number; ttT: number;
  pens: Set<ScoreKey>; sigUsed: boolean; sigT: number;
  flashMsg: string; flashT: number; flashType: "pen" | "rew" | "warn" | "info";
  parking: PZone;
  hornT: number;
  // Roundabout state
  inRoundabout: boolean; roundaboutId: number;
}

/* ═══════════════════════════════════════════════════════════════
   Score items
   ═══════════════════════════════════════════════════════════════ */
const SCORES: ScoreItem[] = [
  { key: "seat_adjust", label: "تعديل الكرسي", max: 2, section: 1 }, { key: "mirror_adjust", label: "تعديل المرايا", max: 2, section: 1 },
  { key: "seatbelt", label: "حزام الأمان", max: 2, section: 1 }, { key: "start_observe", label: "المراقبة وبدء الحركة", max: 2, section: 1 },
  { key: "driver_behavior", label: "سلوك السائق", max: 2, section: 1 },
  { key: "gear_use", label: "استخدام الغيار", max: 4, section: 2 }, { key: "road_conditions", label: "الظروف المحيطة", max: 3, section: 2 },
  { key: "steering_control", label: "السيطرة على المقود", max: 4, section: 2 }, { key: "positioning", label: "التموضع", max: 4, section: 2 },
  { key: "indicator_use", label: "استخدام الغماز", max: 3, section: 3 }, { key: "lane_keeping", label: "الحفاظ على المسرب", max: 4, section: 3 },
  { key: "turn_selection", label: "اختيار مكان الدوران", max: 4, section: 3 }, { key: "sign_compliance", label: "مراعاة الشواخص", max: 4, section: 3 },
  { key: "traffic_attention", label: "الانتباه لحركة المرور", max: 4, section: 4 }, { key: "ground_marks", label: "العلامات الأرضية", max: 4, section: 4 },
  { key: "intersections", label: "التعامل مع المقاطعات", max: 4, section: 4 }, { key: "indicator_procedure", label: "الغماز عند كل إجراء", max: 3, section: 4 },
  { key: "overtake_timing", label: "اختيار وقت التجاوز", max: 3, section: 5 }, { key: "overtake_signal", label: "غماز التجاوز", max: 2, section: 5 },
  { key: "overtake_monitor", label: "المراقبة أثناء التجاوز", max: 3, section: 5 }, { key: "overtake_return", label: "العودة للمسرب بأمان", max: 2, section: 5 },
  { key: "normal_stop", label: "الوقوف العادي", max: 2, section: 6 }, { key: "sudden_stop", label: "الوقوف المفاجئ", max: 3, section: 6 },
  { key: "intersection_gap", label: "مسافة الأمان بالتقاطع", max: 3, section: 6 }, { key: "stop_signs", label: "شواخص الوقوف", max: 2, section: 6 },
  { key: "pedestrians", label: "التعامل مع المشاة", max: 4, section: 7 }, { key: "vehicles", label: "التعامل مع المركبات", max: 4, section: 7 },
  { key: "road_env", label: "بيئة الطريق", max: 4, section: 7 }, { key: "obstacles", label: "التعامل مع العوائق", max: 3, section: 7 },
  { key: "parking_safe", label: "الوقوف الآمن للرجوع", max: 2, section: 8 }, { key: "reverse_look", label: "النظر قبل الرجوع", max: 2, section: 8 },
  { key: "reverse_monitor", label: "المراقبة أثناء الرجوع", max: 3, section: 8 }, { key: "parking_align", label: "الاصطفاف", max: 3, section: 8 },
];
const SEC_NAMES = ["", "الاستعداد", "السيطرة", "الدوران", "قواعد المرور", "التجاوز", "الوقوف والأمان", "عناصر المرور", "الاصطفاف"];
const TARGET_DIST = 15000;
const CAR_COLS = ["#1E40AF", "#B91C1C", "#15803D", "#C2410C", "#6D28D9", "#0369A1", "#475569", "#1C1917", "#F5F5F4", "#CA8A04"];

/* ═══════════════════════════════════════════════════════════════
   Environment Definitions — Enhanced landmarks per city
   ═══════════════════════════════════════════════════════════════ */
interface EnvDef {
  id: EnvId; name: string; sub: string; icon: string;
  skyTop: string; skyMid: string; skyBot: string;
  groundColor: string; roadColor: string;
  blds: { type: string; label: string; sub: string; color: string; awc: string; hasAw: boolean; }[];
  treeTypes: string[];
  hasSea: boolean; hasSand: boolean; hasFarm: boolean; hasPetra: boolean;
  roundaboutFreq: number; // 1=high,2=medium,3=low
}
const ENVIRONMENTS: EnvDef[] = [
  {
    id: "amman", name: "عمّان", sub: "شوارع حديثة", icon: "🏙️",
    skyTop: "#5FA8DB", skyMid: "#9CC8E8", skyBot: "#D8E6D0",
    groundColor: "#C9C2B4", roadColor: "#48433C",
    blds: [
      { type: "shop", label: "دكّانة أبو محمود", sub: "بقالة وتموين", color: "#C4A882", awc: "#2E7D32", hasAw: true },
      { type: "bakery", label: "مخبز الصفا", sub: "خبز عربي طازج", color: "#D4C0A0", awc: "#D84315", hasAw: true },
      { type: "pharmacy", label: "صيدلية الشفاء", sub: "24 ساعة", color: "#E8E0D0", awc: "#4CAF50", hasAw: true },
      { type: "school", label: "مدرسة الأمل", sub: "الأساسية المختلطة", color: "#B8C4D0", awc: "#5C6BC0", hasAw: true },
      { type: "gov", label: "دائرة السير", sub: "وزارة الداخلية", color: "#9E9E8E", awc: "#37474F", hasAw: false },
      { type: "university", label: "الجامعة الأردنية", sub: "عمّان", color: "#C8B8A0", awc: "#1565C0", hasAw: false },
      { type: "restaurant", label: "مطعم المنسف", sub: "منسف أردني أصيل", color: "#D0B898", awc: "#BF360C", hasAw: true },
      { type: "cafe", label: "كوفي شوب وسط البلد", sub: "قهوة مختصة", color: "#C8B090", awc: "#795548", hasAw: true },
      { type: "mosque", label: "مسجد الملك حسين", sub: "", color: "#D8D0C0", awc: "#0097A7", hasAw: false },
      { type: "bank", label: "بنك الأردن", sub: "فرع العبدلي", color: "#E0E0D0", awc: "#1565C0", hasAw: true },
      { type: "shop", label: "مول العبدلي", sub: "تسوق وترفيه", color: "#D6DCE8", awc: "#283593", hasAw: false },
      { type: "house", label: "", sub: "", color: "#C8BCA8", awc: "", hasAw: false },
      { type: "shop", label: "مكتبة الأمل", sub: "قرطاسية وكتب", color: "#D8D0C0", awc: "#6A1B9A", hasAw: true },
      { type: "restaurant", label: "فالافل الحاج", sub: "فلافل ساخنة", color: "#D8C8A8", awc: "#E65100", hasAw: true },
      { type: "tower", label: "برج الأعمال", sub: "", color: "#A9B7C6", awc: "#0D47A1", hasAw: false },
      { type: "hospital", label: "مستشفى الجامعة", sub: "طوارئ 24 ساعة", color: "#E8F0E8", awc: "#C62828", hasAw: false },
      { type: "stadium", label: "ستاد عمّان", sub: "الملعب الدولي", color: "#B0C8B0", awc: "#1B5E20", hasAw: false },
      { type: "palace", label: "القصر الملكي", sub: "الهاشمية", color: "#E8E0CC", awc: "#BF360C", hasAw: false },
    ],
    treeTypes: ["cypress", "olive", "pine"],
    hasSea: false, hasSand: false, hasFarm: false, hasPetra: false, roundaboutFreq: 2,
  },
  {
    id: "irbid", name: "إربد", sub: "مزارع وحقول خضار خصبة", icon: "🌿",
    skyTop: "#6FB1E0", skyMid: "#A9D2E6", skyBot: "#CFE8B8",
    groundColor: "#9CB06A", roadColor: "#4A4438",
    blds: [
      { type: "shop", label: " دكّانة أبو محمود", sub: "بقالة وتموين", color: "#C4A882", awc: "#2E7D32", hasAw: true },
      { type: "bakery", label: "مخبز الوطن", sub: "خبز عربي طازج", color: "#D4C0A0", awc: "#D84315", hasAw: true },
      { type: "pharmacy", label: "صيدلية ", sub: "24 ساعة", color: "#E8E0D0", awc: "#4CAF50", hasAw: true },
      { type: "school", label: "مدرسة الصريح", sub: "الأساسية المختلطة", color: "#B8C4D0", awc: "#5C6BC0", hasAw: true },
      { type: "gov", label: "محافظة إربد", sub: "البلدية الكبرى", color: "#9E9E8E", awc: "#37474F", hasAw: false },
      { type: "university", label: "جامعة اليرموك", sub: "إربد", color: "#C8B8A0", awc: "#1565C0", hasAw: false },
      { type: "restaurant", label: "مطعم منسف", sub: "منسف أردني أصيل", color: "#D0B898", awc: "#BF360C", hasAw: true },
      { type: "cafe", label: "قهوة أبو الليف", sub: "شاي وقهوة", color: "#C8B090", awc: "#795548", hasAw: true },
      { type: "mosque", label: "مسجد الحسن الكبير", sub: "", color: "#D8D0C0", awc: "#0097A7", hasAw: false },
      { type: "bank", label: "بنك الإسكان", sub: "فرع إربد", color: "#E0E0D0", awc: "#1565C0", hasAw: true },
      { type: "farm", label: "مزرعة الخضار", sub: "خضار طازجة يومياً", color: "#A8C078", awc: "#33691E", hasAw: true },
      { type: "house", label: "", sub: "", color: "#C8BCA8", awc: "", hasAw: false },
      { type: "farm", label: "بيوت بلاستيكية", sub: "", color: "#D8E4D8", awc: "", hasAw: false },
      { type: "restaurant", label: "فالافل الحاج", sub: "فلافل ساخنة", color: "#D8C8A8", awc: "#E65100", hasAw: true },
      { type: "barn", label: "مزرعة", sub: "", color: "#A89070", awc: "#5D4037", hasAw: false },
      { type: "farm", label: "سوق الخضار", sub: "بالجملة والمفرق", color: "#C0CC88", awc: "#558B2F", hasAw: true },
      { type: "olive_press", label: "معصرة زيتون", sub: "موسم الزيتون", color: "#8A9060", awc: "#33691E", hasAw: false },
      { type: "market", label: "سوق إربد القديم", sub: "تراث وأصالة", color: "#C0A878", awc: "#4E342E", hasAw: true },
    ],
    treeTypes: ["olive", "cypress", "fruit"],
    hasSea: false, hasSand: false, hasFarm: true, hasPetra: false, roundaboutFreq: 1,
  },
  {
    id: "aqaba", name: "العقبة", sub: "بحر أحمر وشواطئ ذهبية", icon: "🏖️",
    skyTop: "#2E8FD8", skyMid: "#6BBDE8", skyBot: "#E0D4A8",
    groundColor: "#D8C49A", roadColor: "#444038",
    blds: [
      { type: "shop", label: "دكّانة البحر", sub: "بقالة وتموين", color: "#C4A882", awc: "#2E7D32", hasAw: true },
      { type: "hotel", label: "فندق المرجان", sub: "شاطئ خاص", color: "#E8E0D0", awc: "#0277BD", hasAw: true },
      { type: "pharmacy", label: "صيدلية الشفاء", sub: "24 ساعة", color: "#E8E0D0", awc: "#4CAF50", hasAw: true },
      { type: "resort", label: "منتجع تالا باي", sub: "", color: "#F0E8D0", awc: "#00838F", hasAw: true },
      { type: "gov", label: "سلطة العقبة الاقتصادية", sub: "ASEZA", color: "#9E9E8E", awc: "#37474F", hasAw: false },
      { type: "port", label: "ميناء العقبة", sub: "الميناء التجاري", color: "#C8C0B0", awc: "#0D47A1", hasAw: false },
      { type: "restaurant", label: "مطعم المأكولات البحرية", sub: "أسماك طازجة", color: "#D0B898", awc: "#01579B", hasAw: true },
      { type: "cafe", label: "كافيه الكورنيش", sub: "إطلالة بحرية", color: "#C8B090", awc: "#00ACC1", hasAw: true },
      { type: "mosque", label: "مسجد شريف الحسين", sub: "", color: "#D8D0C0", awc: "#0097A7", hasAw: false },
      { type: "bank", label: "بنك الأردن", sub: "فرع العقبة", color: "#E0E0D0", awc: "#1565C0", hasAw: true },
      { type: "dive_shop", label: "مركز الغوص", sub: "غطس وسنوركل", color: "#C8E0E8", awc: "#006064", hasAw: true },
      { type: "hotel", label: "فندق الموج الأزرق", sub: "5 نجوم", color: "#EAE2D0", awc: "#0288D1", hasAw: true },
      { type: "beach", label: "شاطئ الرايا", sub: "شاطئ عام", color: "#E8D8B0", awc: "#F9A825", hasAw: true },
      { type: "museum", label: "متحف العقبة البحري", sub: "تراث بحري", color: "#D8D0C0", awc: "#00695C", hasAw: false },
    ],
    treeTypes: ["palm", "palm", "palm"],
    hasSea: true, hasSand: true, hasFarm: false, hasPetra: false, roundaboutFreq: 2,
  },
  {
    id: "petra", name: "البتراء", sub: "صحراء ومعالم أثرية خالدة", icon: "🏛️",
    skyTop: "#D4935A", skyMid: "#E8B87A", skyBot: "#E8D4A8",
    groundColor: "#D8B888", roadColor: "#534A3E",
    blds: [
      { type: "shop", label: "دكّانة البدو", sub: "بقالة وتموين", color: "#C4A882", awc: "#2E7D32", hasAw: true },
      { type: "hotel", label: "فندق البتراء موفنبيك", sub: "", color: "#E0D0B0", awc: "#A1887F", hasAw: true },
      { type: "pharmacy", label: "صيدلية الشفاء", sub: "24 ساعة", color: "#E8E0D0", awc: "#4CAF50", hasAw: true },
      { type: "shop", label: "سوق التذكارات", sub: "حرف يدوية بدوية", color: "#D8C0A0", awc: "#8D6E63", hasAw: true },
      { type: "gov", label: "دائرة السير", sub: "وزارة الداخلية", color: "#9E9E8E", awc: "#37474F", hasAw: false },
      { type: "visitor", label: "مركز زوار البتراء", sub: "التذاكر والمعلومات", color: "#C8B8A0", awc: "#6D4C41", hasAw: false },
      { type: "restaurant", label: "مطعم الكنز", sub: "مأكولات بدوية", color: "#D0B898", awc: "#BF360C", hasAw: true },
      { type: "cafe", label: "مقهى البدو", sub: "شاي بالأعشاب", color: "#C8B090", awc: "#795548", hasAw: true },
      { type: "mosque", label: "مسجد وادي موسى", sub: "", color: "#D8D0C0", awc: "#0097A7", hasAw: false },
      { type: "bank", label: "بنك الأردن", sub: "فرع البتراء", color: "#E0E0D0", awc: "#1565C0", hasAw: true },
      { type: "horses", label: "محل خيول ومرشدين", sub: "رحلات بالخيل", color: "#D8D0C0", awc: "#6D4C41", hasAw: true },
      { type: "museum", label: "متحف البتراء", sub: "تاريخ النبطيين", color: "#C8B898", awc: "#5D4037", hasAw: false },
      { type: "heritage", label: "قرية أم صيحون", sub: "بيوت بدوية أصيلة", color: "#D4C0A0", awc: "#795548", hasAw: false },
    ],
    treeTypes: ["palm", "desertshrub", "desertshrub"],
    hasSea: false, hasSand: true, hasFarm: false, hasPetra: true, roundaboutFreq: 3,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Car definitions
   ═══════════════════════════════════════════════════════════════ */
interface CarDef { id: string; name: string; sub: string; color: string; accent: string; icon: string; accelMul: number; handlingMul: number; }
const CARS: CarDef[] = [
  { id: "sedan", name: "سيدان كلاسيكية", sub: "توازن مثالي للفحص", color: "#F5F5F4", accent: "#1d4ed8", icon: "🚗", accelMul: 1, handlingMul: 1 },
  { id: "suv", name: "دفع رباعي SUV", sub: "ثبات أعلى، تسارع أهدأ", color: "#374151", accent: "#f59e0b", icon: "🚙", accelMul: 0.85, handlingMul: 0.9 },
  { id: "sport", name: "رياضية سريعة", sub: "تسارع عالي، يتطلب دقة", color: "#B91C1C", accent: "#fbbf24", icon: "🏎️", accelMul: 1.25, handlingMul: 1.1 },
  { id: "hatch", name: "هاتشباك اقتصادية", sub: "خفيفة وسهلة القيادة", color: "#15803D", accent: "#e2e8f0", icon: "🚘", accelMul: 0.95, handlingMul: 1.15 },
];

/* ═══════════════════════════════════════════════════════════════
   Drawing helpers
   ═══════════════════════════════════════════════════════════════ */
function lighten(hex: string, amt: number) { return shade(hex, amt); }
function darken(hex: string, amt: number) { return shade(hex, -amt); }
function shade(hex: string, amt: number) {
  let h = hex.replace("#", ""); if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
  const num = parseInt(h, 16); let r = (num >> 16) + amt, gC = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); gC = Math.max(0, Math.min(255, gC)); b = Math.max(0, Math.min(255, b));
  return "#" + ((r << 16) | (gC << 8) | b).toString(16).padStart(6, "0");
}

function drawPalm(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // ... الكود موجود
  c.fillStyle = "#7A5C14"; c.beginPath(); c.moveTo(x - 3 * s, y); c.lineTo(x + 3 * s, y); c.lineTo(x + 2 * s, y - 50 * s); c.lineTo(x - 2 * s, y - 50 * s); c.closePath(); c.fill();
  [[-26, -6, -3, -56, 5, 0], [26, -6, 3, -56, -5, 0], [-16, -3, -1, -62, 10, 2], [16, -3, 1, -62, -10, 2], [0, -22, 0, -68, 0, 7], [-30, -24, -7, -62, 3, 0], [30, -24, 7, -62, -3, 0]].forEach(([a, b, d, e, f, g]) => {
    c.fillStyle = "#2d7a2d"; c.beginPath(); c.moveTo(x + a * s, y + b * s); c.bezierCurveTo(x + (a * .5 + d * .5) * s, y + (b * .5 + e * .5) * s, x + d * s, y + e * s, x + d * s, y + e * s); c.bezierCurveTo(x + (d * .5 + f * .5) * s, y + (e * .5 + g * .5) * s, x + f * s, y + g * s, x + a * s, y + b * s); c.fill();
  });
}
function drawOlive(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#6B5030"; c.fillRect(x - 2 * s, y - 15 * s, 4 * s, 15 * s); c.fillStyle = "#4A7A3A"; c.beginPath(); c.arc(x, y - 20 * s, 14 * s, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#3A6A2A"; c.beginPath(); c.arc(x - 6 * s, y - 24 * s, 10 * s, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + 7 * s, y - 22 * s, 9 * s, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#5A8A4A"; c.beginPath(); c.arc(x + 2 * s, y - 28 * s, 8 * s, 0, Math.PI * 2); c.fill();
}
function drawCypress(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#5A4A30"; c.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s); c.fillStyle = "#2A5A2A"; c.beginPath(); c.moveTo(x, y - 55 * s); c.lineTo(x + 8 * s, y - 10 * s); c.lineTo(x - 8 * s, y - 10 * s); c.closePath(); c.fill();
  c.fillStyle = "#1A4A1A"; c.beginPath(); c.moveTo(x, y - 55 * s); c.lineTo(x + 5 * s, y - 30 * s); c.lineTo(x - 5 * s, y - 30 * s); c.closePath(); c.fill();
}
function drawPine(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#5A4A30"; c.fillRect(x - 2 * s, y - 8 * s, 4 * s, 8 * s);
  [0, 1, 2].forEach(i => {
    c.fillStyle = ["#356B35", "#2E5E2E", "#264E26"][i];
    c.beginPath(); c.moveTo(x, y - (50 - i * 12) * s); c.lineTo(x + (14 - i * 2) * s, y - (8 + i * 12) * s); c.lineTo(x - (14 - i * 2) * s, y - (8 + i * 12) * s); c.closePath(); c.fill();
  });
}
function drawFruitTree(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#6B5030"; c.fillRect(x - 2 * s, y - 14 * s, 4 * s, 14 * s);
  c.fillStyle = "#4F8F3F"; c.beginPath(); c.arc(x, y - 22 * s, 13 * s, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#E53935";
  [[-5, -22], [6, -26], [-2, -30], [8, -18], [-9, -16]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, 1.6 * s, 0, Math.PI * 2); c.fill(); });
}
function drawDesertShrub(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.strokeStyle = "#8a7a52"; c.lineWidth = 2 * s;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.35;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 16 * s, y + Math.sin(a) * 16 * s); c.stroke();
  }
  c.fillStyle = "#9c8a5c"; c.beginPath(); c.ellipse(x, y, 5 * s, 3 * s, 0, 0, Math.PI * 2); c.fill();
}
function drawTree(c: CanvasRenderingContext2D, tr: TreeO) {
  const { x, y, scale: s, type } = tr;
  if (type === "palm") drawPalm(c, x, y + 50 * s, s);
  else if (type === "olive") drawOlive(c, x, y + 15 * s, s);
  else if (type === "pine") drawPine(c, x, y + 10 * s, s);
  else if (type === "fruit") drawFruitTree(c, x, y + 15 * s, s);
  else if (type === "desertshrub") drawDesertShrub(c, x, y + 2 * s, s);
  else drawCypress(c, x, y + 10 * s, s);
}

function drawSL(c: CanvasRenderingContext2D, x: number, y: number) {
  c.strokeStyle = "#6b7060"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 55); c.stroke();
  c.beginPath(); c.moveTo(x, y - 52); c.lineTo(x + 18, y - 55); c.stroke(); c.fillStyle = "#4a4a40"; c.fillRect(x + 13, y - 61, 20, 9);
  const g = c.createRadialGradient(x + 23, y - 56, 0, x + 23, y - 54, 20); g.addColorStop(0, "rgba(255,220,80,0.6)"); g.addColorStop(1, "rgba(255,220,80,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(x + 23, y - 54, 20, 12, 0, 0, Math.PI * 2); c.fill();
}

function drawBldg(c: CanvasRenderingContext2D, b: Bldg, re: number) {
  const bx = b.side === "L" ? re - b.w - 4 : re + 4;
  c.fillStyle = "rgba(0,0,0,0.08)"; c.fillRect(bx + 3, b.y + 3, b.w, b.h); c.fillStyle = b.color; c.fillRect(bx, b.y, b.w, b.h); c.strokeStyle = "rgba(0,0,0,0.15)"; c.lineWidth = 1; c.strokeRect(bx, b.y, b.w, b.h);
  if (b.hasAw) { c.fillStyle = b.awc; c.beginPath(); c.moveTo(bx - 4, b.y); c.lineTo(bx + b.w + 4, b.y); c.lineTo(bx + b.w + 7, b.y - 9); c.lineTo(bx - 7, b.y - 9); c.closePath(); c.fill(); }
  const cols = Math.floor((b.w - 8) / 12), rows = Math.floor((b.h - 20) / 14);
  for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) { c.fillStyle = "rgba(180,215,255,0.55)"; c.fillRect(bx + 6 + cc * 12, b.y + 8 + r * 14, 7, 9); }
  c.fillStyle = "#5D4037"; c.fillRect(bx + b.w / 2 - 5, b.y + b.h - 16, 10, 16);
  if (b.type === "mosque") { c.fillStyle = "#D0D0D0"; c.beginPath(); c.arc(bx + b.w / 2, b.y - 4, 10, Math.PI, 0); c.fill(); c.fillStyle = "#C0C0C0"; c.fillRect(bx + b.w / 2 - 2, b.y - 18, 4, 14); }
  if (b.type === "gov" || b.type === "university" || b.type === "port" || b.type === "visitor" || b.type === "museum") { drawJFlag(c, bx + b.w - 16, b.y - (b.hasAw ? 12 : 2), 14, 9); }
  if (b.type === "tower") { c.fillStyle = "#7a8a9a"; c.fillRect(bx + b.w / 2 - 3, b.y - 22, 6, 22); c.fillStyle = "#cc3333"; c.beginPath(); c.arc(bx + b.w / 2, b.y - 22, 2.5, 0, Math.PI * 2); c.fill(); }
  if (b.type === "hospital") { c.fillStyle = "#C62828"; c.font = "bold 14px sans-serif"; c.textAlign = "center"; c.fillText("✚", bx + b.w / 2, b.y + 18); }
  if (b.type === "hotel" || b.type === "resort") { c.fillStyle = "#fff"; c.font = "bold 10px sans-serif"; c.textAlign = "center"; c.fillText("★★★", bx + b.w / 2, b.y + 12); }
  if (b.label) { c.save(); c.fillStyle = "#222"; c.font = "bold 8px sans-serif"; c.textAlign = "center"; const ty = b.y - (b.hasAw ? 12 : 3); c.fillText(b.label, bx + b.w / 2, ty, b.w + 10); if (b.sub) { c.font = "6.5px sans-serif"; c.fillStyle = "#666"; c.fillText(b.sub, bx + b.w / 2, ty - 9, b.w + 10); } c.restore(); }
}

function drawJFlag(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.fillStyle = "#000"; c.fillRect(x, y, w, h / 3); c.fillStyle = "#fff"; c.fillRect(x, y + h / 3, w, h / 3); c.fillStyle = "#007A3D"; c.fillRect(x, y + 2 * h / 3, w, h / 3);
  c.fillStyle = "#CE1126"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * .45, y + h / 2); c.lineTo(x, y + h); c.closePath(); c.fill();
}

function drawPlayerCar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spd: number, lb: boolean, rb: boolean, bt: number, car: CarDef) {
  const bon = spd === 0; const bOn = Math.floor(bt / 15) % 2 === 0;
  // shadow
  c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.ellipse(x + w / 2, y + h + 5, w * .6, 6, 0, 0, Math.PI * 2); c.fill();
  // body gradient
  const g = c.createLinearGradient(x, y, x, y + h);
  if (bon) { g.addColorStop(0, "#fbbf24"); g.addColorStop(1, "#b45309"); } else { g.addColorStop(0, lighten(car.color, 18)); g.addColorStop(.4, car.color); g.addColorStop(1, darken(car.color, 18)); }
  c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, h, [10, 10, 6, 6]); c.fill();
  // roof
  c.fillStyle = bon ? "#d97706bb" : darken(car.color, 8) + "cc"; c.beginPath(); c.roundRect(x + 4, y + 8, w - 8, h * .38, [7, 7, 2, 2]); c.fill();
  // windshield
  c.fillStyle = "rgba(180,220,255,0.78)"; c.beginPath(); c.roundRect(x + 6, y + 10, w - 12, h * .22, 4); c.fill();
  // reflection
  c.fillStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.moveTo(x + 8, y + 11); c.lineTo(x + 16, y + 11); c.lineTo(x + 14, y + h * .26); c.lineTo(x + 8, y + h * .26); c.fill();
  // headlights
  c.fillStyle = "#fef9c3"; c.fillRect(x + 3, y + 3, 8, 5); c.fillRect(x + w - 11, y + 3, 8, 5);
  // indicators
  if (lb && bOn) { c.fillStyle = "#f59e0b"; c.fillRect(x + 2, y + 8, 5, 5); } if (rb && bOn) { c.fillStyle = "#f59e0b"; c.fillRect(x + w - 7, y + 8, 5, 5); }
  // brake lights
  c.fillStyle = "#ef4444"; c.fillRect(x + 3, y + h - 7, 8, 4); c.fillRect(x + w - 11, y + h - 7, 8, 4);
  // license plate
  c.fillStyle = "#fff"; c.fillRect(x + w * .22, y + h - 11, w * .56, 9); c.strokeStyle = "#999"; c.lineWidth = .5; c.strokeRect(x + w * .22, y + h - 11, w * .56, 9);
  c.fillStyle = "#1d4ed8"; c.font = `bold ${Math.floor(w * .12)}px monospace`; c.textAlign = "center"; c.fillText("JO", x + w / 2, y + h - 4);
  // speed text on car
  c.fillStyle = "#222"; c.font = `bold ${Math.floor(w * .2)}px monospace`; c.fillText(`${Math.floor(spd * 20)}`, x + w / 2, y + h * .72);
}

function drawHCar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(x + w / 2, y + h + 3, w * .5, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, [6, 6, 4, 4]); c.fill(); c.fillStyle = col + "aa"; c.beginPath(); c.roundRect(x + w * .2, y + 3, w * .6, h * .3, [4, 4, 1, 1]); c.fill();
  c.fillStyle = "rgba(180,220,255,0.6)"; c.beginPath(); c.roundRect(x + w * .25, y + 4, w * .5, h * .18, 3); c.fill();
  c.fillStyle = "#fef9c3"; c.fillRect(x + w - 4, y + 2, 4, 4); c.fillRect(x + w - 4, y + h - 6, 4, 4); c.fillStyle = "#ef4444"; c.fillRect(x, y + 2, 4, 4); c.fillRect(x, y + h - 6, 4, 4);
  c.fillStyle = "#fff"; c.fillRect(x + w * .35, y + h - 7, w * .3, 6); c.strokeStyle = "#999"; c.lineWidth = .4; c.strokeRect(x + w * .35, y + h - 7, w * .3, 6);
}

function drawTLBox(c: CanvasRenderingContext2D, x: number, y: number, st: string) {
  c.strokeStyle = "#777"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 55); c.lineTo(x, y + 90); c.stroke();
  c.fillStyle = "#1a1a1a"; c.beginPath(); c.roundRect(x - 9, y, 18, 52, 4); c.fill();
  const lights: [string, string, number][] = [["#ef4444", "red", 8], ["#f59e0b", "yellow", 28], ["#22c55e", "green", 46]];
  lights.forEach(([col, s, ly]) => {
    const on = s === st; c.fillStyle = on ? col : "#333"; c.beginPath(); c.arc(x, y + ly, 6, 0, Math.PI * 2); c.fill();
    if (on) { const gr = c.createRadialGradient(x, y + ly, 0, x, y + ly, 12); gr.addColorStop(0, col + "88"); gr.addColorStop(1, col + "00"); c.fillStyle = gr; c.beginPath(); c.arc(x, y + ly, 12, 0, Math.PI * 2); c.fill(); }
  });
}

/* Roundabout draw */
function drawRoundabout(c: CanvasRenderingContext2D, rb: Roundabout, roadColor: string) {
  const { cx, cy, outerR, innerR } = rb;
  // outer road area
  c.fillStyle = lighten(roadColor, 6);
  c.beginPath(); c.arc(cx, cy, outerR, 0, Math.PI * 2); c.fill();
  // island (center)
  const islandGrad = c.createRadialGradient(cx, cy, 0, cx, cy, innerR);
  islandGrad.addColorStop(0, "#4a7a3a");
  islandGrad.addColorStop(0.6, "#3a6a2a");
  islandGrad.addColorStop(1, "#2a5a2a");
  c.fillStyle = islandGrad;
  c.beginPath(); c.arc(cx, cy, innerR, 0, Math.PI * 2); c.fill();
  // island border
  c.strokeStyle = "#ffffff44"; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, innerR, 0, Math.PI * 2); c.stroke();
  // outer border
  c.strokeStyle = "#f0ece0"; c.lineWidth = 3;
  c.beginPath(); c.arc(cx, cy, outerR, 0, Math.PI * 2); c.stroke();
  // dashed lane line
  c.strokeStyle = "#f5c518"; c.lineWidth = 1.5; c.setLineDash([8, 8]);
  c.beginPath(); c.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2); c.stroke();
  c.setLineDash([]);
  // center decoration - palm or monument
  c.fillStyle = "#5a8a4a";
  c.beginPath(); c.arc(cx, cy, innerR * 0.4, 0, Math.PI * 2); c.fill();
  // flowers / dots on island
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    c.fillStyle = "#e8d44a";
    c.beginPath(); c.arc(cx + Math.cos(a) * innerR * 0.65, cy + Math.sin(a) * innerR * 0.65, 3, 0, Math.PI * 2); c.fill();
  }
  // دوار sign
  c.fillStyle = "#1565C0";
  c.beginPath(); c.roundRect(cx - 18, cy - innerR - 26, 36, 22, 5); c.fill();
  c.fillStyle = "#fff"; c.font = "bold 9px sans-serif"; c.textAlign = "center";
  c.fillText("دوّار", cx, cy - innerR - 10);
  // directional arrow in roundabout (counterclockwise)
  c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, (outerR + innerR) / 2, -Math.PI / 2, Math.PI, false);
  c.stroke();
  // arrowhead
  const ax = cx + Math.cos(Math.PI) * (outerR + innerR) / 2;
  const ay = cy + Math.sin(Math.PI) * (outerR + innerR) / 2;
  c.fillStyle = "rgba(255,255,255,0.5)";
  c.beginPath(); c.moveTo(ax, ay - 6); c.lineTo(ax + 10, ay); c.lineTo(ax, ay + 6); c.closePath(); c.fill();
  // draw cars inside roundabout
  rb.circCars.forEach(cc => {
    const carAngle = cc.angle;
    const carX = cx + Math.cos(carAngle) * cc.r - cc.w / 2;
    const carY = cy + Math.sin(carAngle) * cc.r - cc.h / 2;
    c.save();
    c.translate(carX + cc.w / 2, carY + cc.h / 2);
    c.rotate(carAngle + Math.PI / 2);
    c.translate(-cc.w / 2, -cc.h / 2);
    drawHCar(c, 0, 0, cc.w, cc.h, cc.color);
    c.restore();
  });
}

/* Ocean drawing */
function drawOcean(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, waves: OceanWave[], bgOff: number) {
  // تدرج مائي أكثر طبيعية (ألوان البحر الأحمر)
  const grad = c.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "#0077B6");
  grad.addColorStop(0.3, "#0096C7");
  grad.addColorStop(0.6, "#00B4D8");
  grad.addColorStop(0.85, "#48CAE4");
  grad.addColorStop(1, "#90E0EF");
  c.fillStyle = grad;
  c.fillRect(x, y, w, h);

  // انعكاسات ضوئية (خطوط لامعة متحركة)
  c.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < w; i += 12) {
    const shimY = y + ((i * 5 + bgOff * 0.3) % h);
    c.fillRect(x + i, shimY, 2, 12);
  }

  // طبقات الأمواج (أكثر سلاسة)
  waves.forEach((wave, wi) => {
    const alpha = 0.2 + wi * 0.06;
    c.fillStyle = `rgba(255,255,255,${alpha})`;
    c.beginPath();
    const waveY = y + wave.y;
    c.moveTo(x, waveY);
    for (let i = 0; i <= w; i += 3) {
      const wy = waveY + Math.sin((i / 40 + wave.offset)) * wave.amp * 1.2 +
        Math.sin((i / 25 + wave.offset * 1.4)) * wave.amp * 0.5;
      c.lineTo(x + i, wy);
    }
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
    c.closePath();
    c.fill();
  });

  // رغوة خفيفة جداً (نقاط صغيرة متناثرة)
  c.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < w; i += 15) {
    const foamY = y + waves[0].y + Math.sin((i / 30 + bgOff * 0.02)) * 3;
    c.beginPath();
    c.arc(x + i, foamY + 2, 1.5 + Math.random() * 1, 0, Math.PI * 2);
    c.fill();
  }

  // شواطئ مرجانية (ألوان دافئة تحت الماء)
  const reefGrad = c.createRadialGradient(x + w * 0.2, y + h * 0.9, 0, x + w * 0.2, y + h * 0.9, 60);
  reefGrad.addColorStop(0, "rgba(255,160,80,0.15)");
  reefGrad.addColorStop(0.6, "rgba(255,200,150,0.08)");
  reefGrad.addColorStop(1, "rgba(255,220,200,0)");
  c.fillStyle = reefGrad;
  c.beginPath();
  c.ellipse(x + w * 0.2, y + h * 0.9, 80, 20, 0, 0, Math.PI * 2);
  c.fill();

  // كتابة "البحر الأحمر" بلون شفاف وأنيق
  c.fillStyle = "rgba(255,255,255,0.25)";
  c.font = "bold 12px 'Segoe UI', sans-serif";
  c.textAlign = "center";
  c.fillText("البحر الأحمر", x + w / 2, y + 22);
  c.fillStyle = "rgba(255,255,255,0.1)";
  c.font = "10px sans-serif";
  c.fillText("🌊", x + w / 2 - 30, y + 22);
}

function drawPothole(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { c.fillStyle = "#0f0c0a"; c.beginPath(); c.ellipse(x + w / 2, y + h / 2 + 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#1c1814"; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#3d3428"; c.lineWidth = 1.5; c.stroke(); }
function drawSpeedbump(c: CanvasRenderingContext2D, x: number, y: number, w: number) { c.fillStyle = "#f59e0b"; c.beginPath(); c.roundRect(x, y, w, 12, 3); c.fill(); c.fillStyle = "#000"; c.font = "bold 7px sans-serif"; c.textAlign = "center"; c.fillText("مطب", x + w / 2, y + 9); }


function drawPedestrian(c: CanvasRenderingContext2D, x: number, y: number, dir: number, hit: boolean) {
  const s = 1.0;
  
  // Shadow
  c.fillStyle = "rgba(0,0,0,0.15)";
  c.beginPath();
  c.ellipse(x + 2, y + 24 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Body (thobe / dishdasha)
  const bodyColor = hit ? "#b91c1c" : "#1a3a5c";
  const bodyColorLight = hit ? "#dc2626" : "#2a5a8c";
  
  // Long thobe
  const grad = c.createLinearGradient(x, y + 6 * s, x, y + 26 * s);
  grad.addColorStop(0, bodyColorLight);
  grad.addColorStop(1, bodyColor);
  c.fillStyle = grad;
  c.beginPath();
  c.roundRect(x - 7 * s, y + 6 * s, 14 * s, 20 * s, [3, 3, 5, 5]);
  c.fill();
  
  // Thobe details - neck opening
  c.fillStyle = hit ? "#7f1d1d" : "#0a2a4a";
  c.beginPath();
  c.moveTo(x - 2 * s, y + 6 * s);
  c.lineTo(x + 2 * s, y + 6 * s);
  c.lineTo(x + 4 * s, y + 10 * s);
  c.lineTo(x - 4 * s, y + 10 * s);
  c.closePath();
  c.fill();
  
  // Belt / agal detail at waist
  c.fillStyle = hit ? "#991b1b" : "#1a3a5c";
  c.fillRect(x - 6 * s, y + 12 * s, 12 * s, 2 * s);

  // Head
  c.fillStyle = "#d4a574";
  c.beginPath();
  c.arc(x, y + 4 * s, 6 * s, 0, Math.PI * 2);
  c.fill();
  
  // Hair (dark)
  c.fillStyle = "#2d1a0a";
  c.beginPath();
  c.ellipse(x, y + 1 * s, 6 * s, 3 * s, 0, 0, Math.PI * 2);
  c.fill();

  // SHEMAGH / KUFIYA
  // Shemagh base (red/white pattern)
  c.fillStyle = "#c41e3a";
  c.beginPath();
  c.ellipse(x - 2 * s, y - 1 * s, 14 * s, 8 * s, -0.1, 0, Math.PI * 2);
  c.fill();
  
  // White pattern lines on shemagh
  c.strokeStyle = "rgba(255,255,255,0.5)";
  c.lineWidth = 1.5;
  for (let i = -12; i <= 12; i += 6) {
    c.beginPath();
    c.moveTo(x + i * s, y - 4 * s);
    c.lineTo(x + (i + 4) * s, y + 4 * s);
    c.stroke();
  }
  for (let i = -10; i <= 10; i += 6) {
    c.beginPath();
    c.moveTo(x + i * s, y - 2 * s);
    c.lineTo(x + (i + 6) * s, y + 6 * s);
    c.stroke();
  }
  
  // Agal (black cord) on top
  c.fillStyle = "#1a1a1a";
  c.beginPath();
  c.ellipse(x - 1 * s, y - 3 * s, 8 * s, 3 * s, -0.1, 0, Math.PI * 2);
  c.fill();
  
  // Agal tassel
  c.fillStyle = "#1a1a1a";
  c.fillRect(x - 8 * s, y - 2 * s, 2 * s, 4 * s);
  c.fillRect(x + 6 * s, y - 2 * s, 2 * s, 4 * s);

  // Shemagh tail hanging on shoulder
  c.fillStyle = "#c41e3a";
  c.beginPath();
  c.moveTo(x + 6 * s, y + 2 * s);
  c.lineTo(x + 12 * s, y + 8 * s);
  c.lineTo(x + 8 * s, y + 10 * s);
  c.lineTo(x + 4 * s, y + 4 * s);
  c.closePath();
  c.fill();
  
  // White pattern on tail
  c.strokeStyle = "rgba(255,255,255,0.3)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 7 * s, y + 4 * s);
  c.lineTo(x + 10 * s, y + 7 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(x + 5 * s, y + 4 * s);
  c.lineTo(x + 9 * s, y + 8 * s);
  c.stroke();

  // Eyes
  c.fillStyle = "#1a1a1a";
  c.beginPath();
  c.arc(x - 2.5 * s, y + 3 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + 2.5 * s, y + 3 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  
  // Eye white highlight
  c.fillStyle = "rgba(255,255,255,0.4)";
  c.beginPath();
  c.arc(x - 3 * s, y + 2.5 * s, 0.5 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + 2 * s, y + 2.5 * s, 0.5 * s, 0, Math.PI * 2);
  c.fill();

  // Eyebrows
  c.strokeStyle = "#1a1a1a";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x - 4 * s, y + 1.5 * s);
  c.lineTo(x - 1.5 * s, y + 1.5 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(x + 4 * s, y + 1.5 * s);
  c.lineTo(x + 1.5 * s, y + 1.5 * s);
  c.stroke();

  // Nose
  c.fillStyle = "#c4956a";
  c.beginPath();
  c.moveTo(x, y + 4 * s);
  c.lineTo(x - 1 * s, y + 6 * s);
  c.lineTo(x + 1 * s, y + 6 * s);
  c.closePath();
  c.fill();

  // Mouth (small smile)
  c.strokeStyle = "#8a5a3a";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x, y + 7 * s, 1.5 * s, 0.1, Math.PI - 0.1);
  c.stroke();

  // Arms with hands
  c.fillStyle = "#d4a574";
  // Left arm
  c.fillRect(x - 8 * s, y + 8 * s, 2 * s, 6 * s);
  // Right arm
  c.fillRect(x + 6 * s, y + 8 * s, 2 * s, 6 * s);
  
  // Hands
  c.beginPath();
  c.arc(x - 8 * s, y + 14 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + 8 * s, y + 14 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();

  // Legs
  c.fillStyle = hit ? "#7f1d1d" : "#0a2a4a";
  c.fillRect(x - 5 * s, y + 26 * s, 3.5 * s, 6 * s);
  c.fillRect(x + 1.5 * s, y + 26 * s, 3.5 * s, 6 * s);
  
  // Feet (sandals)
  c.fillStyle = "#5a3a1a";
  c.fillRect(x - 6 * s, y + 31 * s, 5 * s, 2 * s);
  c.fillRect(x + 1 * s, y + 31 * s, 5 * s, 2 * s);

  // Small white ghutra/tassel detail
  c.fillStyle = "rgba(255,255,255,0.3)";
  for (let i = -10; i <= 10; i += 4) {
    if (Math.random() > 0.6) {
      c.fillRect(x + i * s, y - 2 * s, 1, 2);
    }
  }

  // Direction arrow (subtle)
  c.fillStyle = "rgba(255,255,255,0.15)";
  c.font = "8px sans-serif";
  c.textAlign = "center";
  c.fillText(dir > 0 ? "→" : "←", x, y - 12 * s);
}


function drawCat(c: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  c.fillStyle = "#F5A623"; c.beginPath(); c.ellipse(x, y, 6, 4, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x + dir * 5, y - 3, 3.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#333"; c.beginPath(); c.arc(x + dir * 6, y - 4, 1, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#F5A623"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - dir * 2, y - 5); c.lineTo(x - dir * 2, y - 9); c.moveTo(x + dir * 1, y - 5); c.lineTo(x + dir * 1, y - 9); c.stroke();
  c.beginPath(); c.moveTo(x - dir * 5, y + 2); c.quadraticCurveTo(x - dir * 8, y + 8, x - dir * 4, y + 6); c.stroke();
}
function drawCamel(c: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  c.fillStyle = "#C8A876";
  c.beginPath(); c.ellipse(x, y, 16, 9, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x - 2, y - 10, 7, 8, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + dir * 12, y - 4); c.lineTo(x + dir * 22, y - 14); c.lineTo(x + dir * 18, y - 2); c.closePath(); c.fill();
  c.fillStyle = "#A8895E"; c.fillRect(x - 12, y + 6, 4, 10); c.fillRect(x + 8, y + 6, 4, 10);
}
function drawCone(c: CanvasRenderingContext2D, x: number, y: number) { c.fillStyle = "#f97316"; c.beginPath(); c.moveTo(x, y - 22); c.lineTo(x + 8, y); c.lineTo(x - 8, y); c.closePath(); c.fill(); c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.moveTo(x, y - 22); c.lineTo(x + 8, y - 11); c.lineTo(x - 8, y - 11); c.closePath(); c.fill(); c.fillStyle = "#888"; c.fillRect(x - 10, y, 20, 3); }
function drawSpeedSign(c: CanvasRenderingContext2D, x: number, y: number, lim: number) {
  c.strokeStyle = "#888"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 18); c.lineTo(x, y + 40); c.stroke();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#dc2626"; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = "#111"; c.font = "bold 11px sans-serif"; c.textAlign = "center"; c.fillText(`${lim}`, x, y + 4);
}
function drawStopSignBox(c: CanvasRenderingContext2D, x: number, y: number) {
  c.strokeStyle = "#888"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x, y + 40); c.stroke();
  c.fillStyle = "#dc2626"; c.beginPath(); for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i - Math.PI / 8; if (i === 0) c.moveTo(x + 14 * Math.cos(a), y + 14 * Math.sin(a)); else c.lineTo(x + 14 * Math.cos(a), y + 14 * Math.sin(a)); } c.closePath(); c.fill();
  c.fillStyle = "#fff"; c.font = "bold 7px sans-serif"; c.textAlign = "center"; c.fillText("STOP", x, y + 2); c.font = "bold 6px sans-serif"; c.fillText("قف", x, y + 10);
}
function drawGovSignBox(c: CanvasRenderingContext2D, x: number, y: number, dest: string, km: number, side: string) {
  const bw = 80, bh = 32, bx = side === "L" ? x + 5 : x - bw - 5;
  c.strokeStyle = "#888"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 45); c.stroke();
  c.fillStyle = "#1a6b3a"; c.beginPath(); c.roundRect(bx, y - bh, bw, bh, 3); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1; c.beginPath(); c.roundRect(bx + 1, y - bh + 1, bw - 2, bh - 2, 2); c.stroke();
  c.fillStyle = "#fff"; c.font = "bold 9px sans-serif"; c.textAlign = "center"; c.fillText(side === "L" ? "←" : "→", bx + (side === "L" ? 10 : bw - 10), y - bh / 2 + 3);
  c.font = "bold 8px sans-serif"; c.fillText(dest, bx + bw / 2, y - bh * .6 + 1); c.font = "7px sans-serif"; c.fillText(`${km} كم`, bx + bw / 2, y - bh * .25 + 1);
}
function drawDune(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y + h); c.quadraticCurveTo(x + w * 0.35, y - h * 0.6, x + w * 0.7, y + h * 0.2); c.quadraticCurveTo(x + w * 0.9, y + h * 0.5, x + w, y + h); c.closePath(); c.fill();
}

/* City-specific landmark drawings */
function drawPetraTreasury(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.fillStyle = "rgba(0,0,0,0.1)"; c.fillRect(x + 4, y + 4, w, h);
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, "#E8A878"); g.addColorStop(1, "#C8825A");
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = "#B06B48"; c.lineWidth = 1; c.strokeRect(x, y, w, h);
  const cols2 = 6; for (let i = 0; i < cols2; i++) { c.fillStyle = "#D89868"; c.fillRect(x + (i + 0.5) * (w / cols2) - 3, y + h * 0.18, 6, h * 0.7); }
  c.fillStyle = "#D8946A"; c.beginPath(); c.moveTo(x, y + h * 0.18); c.lineTo(x + w / 2, y - h * 0.18); c.lineTo(x + w, y + h * 0.18); c.closePath(); c.fill();
  c.strokeStyle = "#B06B48"; c.stroke();
  c.fillStyle = "#5a3a28"; c.beginPath(); c.roundRect(x + w / 2 - 8, y + h * 0.55, 16, h * 0.42, [8, 8, 0, 0]); c.fill();
  c.fillStyle = "#E0A484"; c.beginPath(); c.roundRect(x + w * 0.32, y - h * 0.36, w * 0.36, h * 0.2, 3); c.fill();
  c.fillStyle = "#D8946A"; c.beginPath(); c.moveTo(x + w * 0.32, y - h * 0.36); c.lineTo(x + w / 2, y - h * 0.55); c.lineTo(x + w * 0.68, y - h * 0.36); c.closePath(); c.fill();
  c.fillStyle = "#5a3a28"; c.font = "bold 9px sans-serif"; c.textAlign = "center"; c.fillText("الخزنة - البتراء", x + w / 2, y + h + 14);
}

function drawAmmanCitadel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // قلعة عمّان
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, "#C8B888"); g.addColorStop(1, "#A89868");
  c.fillStyle = g; c.fillRect(x, y, w, h);
  // battlements
  const merlonW = 10, gap = 6;
  for (let i = 0; i < w; i += merlonW + gap) {
    c.fillStyle = "#B0A070"; c.fillRect(x + i, y - 12, merlonW, 12);
  }
  // columns
  for (let i = 0; i < 4; i++) {
    c.fillStyle = "#D0C090"; c.fillRect(x + 8 + i * (w - 16) / 3, y + 4, 8, h - 4);
  }
  // arch door
  c.fillStyle = "#7a6a48"; c.beginPath(); c.roundRect(x + w / 2 - 10, y + h - 28, 20, 28, [10, 10, 0, 0]); c.fill();
  // flag
  drawJFlag(c, x + w - 14, y - 28, 14, 9);
  c.fillStyle = "#7a6a48"; c.font = "bold 9px sans-serif"; c.textAlign = "center"; c.fillText("قلعة عمّان", x + w / 2, y + h + 14);
}

function drawIrbidArchway(c: CanvasRenderingContext2D, x: number, y: number) {
  // بوابة إربد التراثية
  c.fillStyle = "#C8A870";
  c.fillRect(x - 20, y, 14, 55);
  c.fillRect(x + 6, y, 14, 55);
  c.beginPath(); c.arc(x, y + 2, 20, Math.PI, 0); c.fill();
  c.fillStyle = "#8a7050";
  c.beginPath(); c.arc(x, y + 2, 13, Math.PI, 0); c.fill();
  c.fillStyle = "#C8A870";
  c.fillRect(x - 4, y + 2, 8, 25);
  c.fillStyle = "#7a6040"; c.font = "bold 8px sans-serif"; c.textAlign = "center"; c.fillText("إربد القديمة", x, y + 68);
}

function drawAqabaFort(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // قلعة العقبة
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, "#E0C888"); g.addColorStop(1, "#C0A868");
  c.fillStyle = g; c.fillRect(x, y, w, h);
  // towers
  [0, w - 14].forEach(tx => {
    c.fillStyle = "#C8B078"; c.fillRect(x + tx, y - 16, 14, h + 16);
    c.fillStyle = "#B0986A"; c.fillRect(x + tx - 2, y - 20, 18, 6);
  });
  // machicolations
  for (let i = 2; i < w - 14; i += 8) {
    c.fillStyle = "#B8A070"; c.fillRect(x + i, y - 8, 5, 8);
  }
  // gate
  c.fillStyle = "#6a5838"; c.beginPath(); c.roundRect(x + w / 2 - 9, y + h - 30, 18, 30, [9, 9, 0, 0]); c.fill();
  drawJFlag(c, x + w / 2 - 5, y - 36, 12, 8);
  c.fillStyle = "#6a5838"; c.font = "bold 9px sans-serif"; c.textAlign = "center"; c.fillText("قلعة العقبة", x + w / 2, y + h + 14);
}

function drawAqabaFlag(c: CanvasRenderingContext2D, x: number, y: number) {
  // عمود علم العقبة الشهير
  c.strokeStyle = "#8a8070"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 90); c.stroke();
  // Big flag
  const fw = 50, fh = 30;
  c.fillStyle = "#000"; c.fillRect(x, y - 90, fw, fh / 3);
  c.fillStyle = "#fff"; c.fillRect(x, y - 90 + fh / 3, fw, fh / 3);
  c.fillStyle = "#007A3D"; c.fillRect(x, y - 90 + 2 * fh / 3, fw, fh / 3);
  c.fillStyle = "#CE1126"; c.beginPath(); c.moveTo(x, y - 90); c.lineTo(x + fw * .4, y - 90 + fh / 2); c.lineTo(x, y - 90 + fh); c.closePath(); c.fill();
  c.fillStyle = "#888"; c.font = "7px sans-serif"; c.textAlign = "center"; c.fillText("أعلى علم في العالم", x + fw / 2, y + 10);
}

function drawParkingZone(c: CanvasRenderingContext2D, z: PZone, carX: number, carY: number, carW: number, carH: number) {
  const { x, y, w, h } = z;
  c.fillStyle = "rgba(37,99,235,0.08)"; c.fillRect(x - 4, y - 4, w + 8, h + 8);
  c.strokeStyle = "#fff"; c.lineWidth = 3; c.setLineDash([]);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.stroke();
  c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w, y + h); c.stroke();
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.stroke();
  c.fillStyle = "#2563EB"; c.beginPath(); c.roundRect(x + w / 2 - 14, y - 34, 28, 28, 8); c.fill();
  c.fillStyle = "#fff"; c.font = "bold 16px sans-serif"; c.textAlign = "center"; c.fillText("P", x + w / 2, y - 14);
  const tx = x + w / 2 - carW / 2, ty = y + h / 2 - carH / 2;
  c.strokeStyle = "rgba(34,197,94,0.4)"; c.lineWidth = 1.5; c.setLineDash([6, 4]);
  c.strokeRect(tx, ty, carW, carH); c.setLineDash([]);
  const cx2 = carX + carW / 2, zx = x + w / 2, hOff = Math.abs(cx2 - zx), hQ = Math.max(0, 1 - hOff / (w / 2 + carW / 2));
  const vTop = Math.max(carY, y), vBot = Math.min(carY + carH, y + h), vOvl = Math.max(0, vBot - vTop), vQ = Math.min(1, vOvl / carH);
  const total = hQ * .6 + vQ * .4;
  const barX = x + w + 14, barW = 10, barH = h, barY = y;
  c.fillStyle = "rgba(0,0,0,0.5)"; c.beginPath(); c.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 5); c.fill();
  const fillH = barH * total; const col = total > .8 ? "#22c55e" : total > .5 ? "#f59e0b" : "#ef4444";
  c.fillStyle = col; c.beginPath(); c.roundRect(barX, barY + barH - fillH, barW, fillH, 4); c.fill();
  c.fillStyle = col; c.font = "bold 11px sans-serif"; c.textAlign = "center";
  c.fillText(`${Math.round(total * 100)}%`, barX + barW / 2, barY - 8);
  return total;
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function JordanDrivingSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const keysRef = useRef(new Set<string>());
  const gsRef = useRef<GS>(mkGS());
  const scRef = useRef<Record<ScoreKey, number>>(mkSc());
  const phRef = useRef<GamePhase>("idle");
  const sndRef = useRef<SoundEngine | null>(null);
  const parkTimerRef = useRef(0);
  const parkAlignRef = useRef(0);
  const envRef = useRef<EnvDef>(ENVIRONMENTS[0]);
  const carRef = useRef<CarDef>(CARS[0]);
  const touchRef = useRef<Record<string, boolean>>({});

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [sc, setSc] = useState<Record<ScoreKey, number>>(mkSc());
  const [dist, setDist] = useState(0);
  const [fMsg, setFMsg] = useState("");
  const [fType, setFType] = useState<"pen" | "rew" | "warn" | "info">("info");
  const [showPanel, setShowPanel] = useState(true);
  const [muted, setMuted] = useState(false);
  const [parkTimer, setParkTimer] = useState(45);
  const [parkAlign, setParkAlign] = useState(0);
  const [scoreRevealed, setScoreRevealed] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<EnvId>("amman");
  const [selectedCar, setSelectedCar] = useState<string>("sedan");
  const [isMobile, setIsMobile] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [currentLane, setCurrentLane] = useState(1);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width:820px),(pointer:coarse)").matches);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function mkGS(): GS {
    return {
      px: 0, py: 0, pw: 36, ph: 64, speed: 0, targetLane: 1, currentLane: 1,
      lcT: 0, lcIng: false, lb: false, rb: false, bt: 0, roadOff: 0, bgOff: 0, dist: 0,
      inters: [], roundabouts: [], obs: [], trees: [], lights: [], bldgs: [], rms: [],
      ptcs: [], govs: [], landmarks: [],
      oceanWaves: [
  { offset: 0, speed: 0.018, amp: 4, y: 30 },
  { offset: 2, speed: 0.025, amp: 3, y: 50 },
  { offset: 5, speed: 0.012, amp: 5, y: 15 },
],
      niDist: 1800, noDist: 600, nbDist: 300, ntDist: 200, nlDist: 6000, nrDist: 2500,
      offRT: 0, ttT: 0, pens: new Set(), sigUsed: false, sigT: 0,
      flashMsg: "", flashT: 0, flashType: "info",
      parking: { x: 0, y: 0, w: 44, h: 85, timer: 0, confirmed: false, alignQ: 0 },
      hornT: 0, inRoundabout: false, roundaboutId: -1,
    };
  }
  function mkSc() { const s = {} as Record<ScoreKey, number>; SCORES.forEach(i => { s[i.key] = i.max; }); return s; }

  const flash = useCallback((msg: string, type: "pen" | "rew" | "warn" | "info") => {
    const g = gsRef.current; g.flashMsg = msg; g.flashT = 110; g.flashType = type; setFMsg(msg); setFType(type);
  }, []);

  const pen = useCallback((k: ScoreKey, msg?: string) => {
    const g = gsRef.current; if (g.pens.has(k)) return; g.pens.add(k);
    const n = { ...scRef.current, [k]: 0 }; scRef.current = n; setSc({ ...n });
    if (msg) flash("✗ " + msg, "pen");
    if (["pedestrians", "vehicles", "obstacles", "road_env", "road_conditions", "steering_control", "intersection_gap"].includes(k)) sndRef.current?.playCollision();
  }, [flash]);

  const rew = useCallback((k: ScoreKey, msg?: string) => { if (msg) flash("✓ " + msg, "rew"); }, [flash]);

  const startParking = useCallback(() => {
    phRef.current = "parking"; setPhase("parking");
    const g = gsRef.current; g.speed = 0; sndRef.current?.stopEngine();
    if (envRef.current.hasSea) sndRef.current?.stopOcean();
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return;
    const cw = r.width, ch = r.height, rr = cw * .65, rw = rr - cw * .35, lw = rw / 3;
    const lane2X = cw * .35 + 2 * lw + lw / 2 - 18;
    g.parking = { x: lane2X - 4, y: ch / 2 - 42, w: 44, h: 85, timer: 45 * 60, confirmed: false, alignQ: 0 };
    parkTimerRef.current = 45 * 60; parkAlignRef.current = 0; setParkTimer(45); setParkAlign(0);
  }, []);

  const confirmParking = useCallback(() => {
    const g = gsRef.current; g.parking.confirmed = true;
    const q = parkAlignRef.current; g.parking.alignQ = q;
    const ns = { ...scRef.current };
    if (q < 0.35) { ns.parking_align = 0; ns.parking_safe = 0; ns.reverse_monitor = 0; }
    else if (q < 0.6) { ns.parking_align = 1; ns.reverse_monitor = 1; }
    else if (q < 0.85) { ns.parking_align = 2; ns.reverse_monitor = 2; }
    else { ns.parking_align = 3; ns.reverse_monitor = 3; ns.parking_safe = 2; }
    if (q >= 0.5) ns.reverse_look = 2;
    scRef.current = ns; setSc({ ...ns }); sndRef.current?.playParkChime();
    setTimeout(() => {
      phRef.current = "finished"; setPhase("finished"); setScoreRevealed(false);
      setTimeout(() => setScoreRevealed(true), 300);
      const total = SCORES.reduce((s, i) => s + ns[i.key], 0);
      if (total >= 75) sndRef.current?.playSuccess(); else sndRef.current?.playFail();
    }, 800);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const snd = new SoundEngine(); sndRef.current = snd;

    const resize = () => {
      const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; ctx.setTransform(2, 0, 0, 2, 0, 0);
      const cw = r.width, ch = r.height, rl = cw * .35, rr = cw * .65, lw = (rr - rl) / 3;
      gsRef.current.px = rl + lw / 2 - 18; gsRef.current.py = ch - 120; gsRef.current.pw = 36; gsRef.current.ph = 64;
    };
    resize(); window.addEventListener("resize", resize);

    const kd = (e: KeyboardEvent) => {
      // Always handle keys, don't restrict to playing phase for indicator keys
      const k = e.key;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "z", "Z", "x", "X", "h", "H", "Enter", "Escape"].includes(k)) {
        e.preventDefault();
      }
      keysRef.current.add(k);
      if (k === "Escape" && phRef.current === "playing") startParking();
      if (k === "Enter" && phRef.current === "parking") confirmParking();
    };
    const ku = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", kd, { capture: true });
    window.addEventListener("keyup", ku, { capture: true });

    let last = performance.now();

    const loop = (t: number) => {
      const dt = Math.min((t - last) / 16, 3); last = t;
      const g = gsRef.current, ph = phRef.current;
      const env = envRef.current;
      const car = carRef.current;
      const r = cv.getBoundingClientRect(); const cw = r.width, ch = r.height;
      const rl = cw * .35, rr = cw * .65, rw = rr - rl, lw = rw / 3;
      const LANES = [rl + lw / 2 - 18, rl + lw + lw / 2 - 18, rl + 2 * lw + lw / 2 - 18];

      // ── SKY ──
      const sky = ctx.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, env.skyTop); sky.addColorStop(.45, env.skyMid); sky.addColorStop(1, env.skyBot);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
      // sun
      const sun = ctx.createRadialGradient(cw * .85, ch * .07, 0, cw * .85, ch * .07, 50);
      sun.addColorStop(0, "rgba(255,245,180,0.9)"); sun.addColorStop(1, "rgba(255,245,180,0)"); ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cw * .85, ch * .07, 50, 0, Math.PI * 2); ctx.fill();
      // clouds
      ctx.fillStyle = "rgba(255,255,255,0.25)"; const cloudOff = (g.bgOff * .15) % 800;
      [[.15, .06, 60, 18], [.4, .04, 80, 20], [.7, .08, 55, 15], [.9, .03, 70, 17]].forEach(([cx2, cy2, w2, h2]) => { ctx.beginPath(); ctx.ellipse(cw * cx2 + Math.sin(cloudOff / w2 + cx2 * 10) * 20, ch * cy2, w2, h2, 0, 0, Math.PI * 2); ctx.fill(); });

      // ── ENVIRONMENT LAYERS ──
      if (env.hasSea) {
  // معاملات محسّنة للبحر
  const seaH = ch * 0.55;
  const seaY = ch * 0.02;
  const seaW = rl - 8; // عرض البحر يصل إلى بداية الطريق تقريباً

  // رسم البحر
  drawOcean(ctx, 2, seaY, seaW, seaH, g.oceanWaves, g.bgOff);

  // ----- شاطئ رملي ناعم (تدرج رقيق جداً) -----
  // نستخدم تدرجاً طويلاً ليمتزج مع لون التربة المحلي
  const beachWidth = 35;
  const beachGrad = ctx.createLinearGradient(seaW - beachWidth, 0, seaW + 12, 0);
  beachGrad.addColorStop(0,   "rgba(232, 213, 160, 0.3)");  // شفاف عند البحر
  beachGrad.addColorStop(0.3, "rgba(224, 204, 150, 0.6)");
  beachGrad.addColorStop(0.7, "rgba(210, 190, 140, 0.85)");
  beachGrad.addColorStop(1,   env.groundColor); // يتطابق مع لون التربة
  ctx.fillStyle = beachGrad;
  ctx.fillRect(seaW - beachWidth, seaY - 2, beachWidth + 14, seaH + 10);

  // خط رغوة خفيف جداً على حافة الماء (بدون مبالغة)
  const foamY = seaY + seaH - 6 + Math.sin(g.bgOff * 0.02) * 2;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.moveTo(seaW - beachWidth, foamY);
  for (let x = seaW - beachWidth; x <= seaW + 12; x += 3) {
    const waveOffset = Math.sin(x * 0.06 + g.bgOff * 0.03) * 3;
    ctx.lineTo(x, foamY + waveOffset);
  }
  ctx.lineTo(seaW + 12, foamY + 8);
  ctx.lineTo(seaW - beachWidth, foamY + 8);
  ctx.closePath();
  ctx.fill();

  // لا نرسم أصداف أو حصى (لإبقاء المشهد نظيفاً)
  // وبدلاً من ذلك نضيف بعض الأعشاب البحرية البسيطة (خطوط خضراء خفيفة)
  ctx.strokeStyle = "rgba(60, 120, 80, 0.15)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const gx = seaW - 20 + (i * 8 + g.bgOff * 0.01) % 50;
    const gy = seaY + seaH - 4 + Math.sin(i * 0.8) * 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx - 4, gy - 12, gx - 2, gy - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 3, gy);
    ctx.quadraticCurveTo(gx + 6, gy - 10, gx + 4, gy - 18);
    ctx.stroke();
  }

  // مركب صيد صغير (اختياري) - نضعه بعيداً عن الأنظار في المنتصف
  const boatX = 60 + Math.sin(g.bgOff * 0.005) * 30;
  const boatY = seaY + seaH * 0.25 + Math.sin(g.bgOff * 0.007 + 0.5) * 12;
  ctx.fillStyle = "#5D4037";
  ctx.beginPath();
  ctx.moveTo(boatX - 14, boatY);
  ctx.quadraticCurveTo(boatX - 16, boatY - 5, boatX - 9, boatY - 8);
  ctx.quadraticCurveTo(boatX, boatY - 10, boatX + 9, boatY - 8);
  ctx.quadraticCurveTo(boatX + 16, boatY - 5, boatX + 14, boatY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#F5F5DC";
  ctx.beginPath();
  ctx.moveTo(boatX, boatY - 8);
  ctx.lineTo(boatX + 5, boatY - 24);
  ctx.lineTo(boatX - 3, boatY - 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boatX, boatY - 8);
  ctx.lineTo(boatX, boatY - 26);
  ctx.stroke();

  // نوارس (طيور) بسيطة وهادئة
  for (let i = 0; i < 3; i++) {
    const gx = 30 + i * 80 + (g.bgOff * 0.015 + i * 40) % 250;
    const gy = seaY + 15 + i * 20 + Math.sin(i * 1.2 + g.bgOff * 0.008) * 6;
    ctx.strokeStyle = "rgba(40,40,40,0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy);
    ctx.quadraticCurveTo(gx - 2, gy - 5, gx, gy - 1);
    ctx.quadraticCurveTo(gx + 2, gy - 5, gx + 5, gy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx - 3, gy + 2);
    ctx.quadraticCurveTo(gx, gy - 2, gx + 3, gy + 2);
    ctx.stroke();
  }

  // --- إزالة أي رسم للكثبان الرملية على الجانب الأيسر ---
  // نمنع رسم drawDune في العقبة (لأن البيئة ساحلية وليست صحراوية)
  // لكن يمكننا ترك رسم صغير للرمال على اليمين فقط (بعيداً عن البحر)
  if (env.hasSand && env.id !== "aqaba") {
    // فقط للبتراء مثلاً
    drawDune(ctx, rl - 50, ch * .55 + (g.bgOff * .1) % 80, 60, 40, "#E0BE8E");
    drawDune(ctx, rr - 10, ch * .7 + (g.bgOff * .13) % 80, 70, 46, "#D8B47E");
  }
}

else if (env.hasPetra) {
        // rocky cliffs
        ctx.fillStyle = "rgba(180,120,80,0.18)"; ctx.beginPath(); ctx.moveTo(0, ch * .4);
        [[0, .32], [.15, .2], [.3, .28], [.45, .14], [.6, .26], [.78, .16], [.9, .26], [1, .2], [1, .4]].forEach(([mx, my]) => ctx.lineTo(cw * mx, ch * my)); ctx.closePath(); ctx.fill();
      } else if (env.hasFarm) {
        // green farmland
        ctx.fillStyle = "rgba(80,140,60,0.15)"; ctx.fillRect(0, ch * 0.1, rl - 4, ch * 0.5);
        ctx.fillStyle = "rgba(100,160,70,0.1)"; ctx.fillRect(rr + 4, ch * 0.1, cw - rr - 4, ch * 0.5);
      } else {
        // hills
        ctx.fillStyle = "rgba(140,130,110,0.22)"; ctx.beginPath(); ctx.moveTo(0, ch * .38);
        [[0, .35], [.1, .24], [.2, .3], [.3, .18], [.42, .28], [.55, .15], [.65, .25], [.75, .2], [.88, .28], [1, .22], [1, .38]].forEach(([mx, my]) => ctx.lineTo(cw * mx, ch * my)); ctx.closePath(); ctx.fill();
      }

      // ── GROUND / SIDEWALKS ──
      
      // ── GROUND / SIDEWALKS ──
if (!env.hasSea) {
  ctx.fillStyle = env.groundColor;
  ctx.fillRect(0, 0, rl, ch);
}
ctx.fillStyle = env.groundColor;
ctx.fillRect(rr, 0, cw - rr, ch);
      const to = g.bgOff % 36; ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 1;
      for (let ty = -36 + to; ty < ch; ty += 36) { ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(rl, ty); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rr, ty); ctx.lineTo(cw, ty); ctx.stroke(); }
      ctx.fillStyle = darken(env.groundColor, 20); ctx.fillRect(rl - 5, 0, 5, ch); ctx.fillRect(rr, 0, 5, ch);
      ctx.fillStyle = lighten(env.groundColor, 18); ctx.fillRect(rl - 2, 0, 2, ch); ctx.fillRect(rr + 3, 0, 2, ch);

      // sand dunes for petra/aqaba
      if (env.hasSand) {
  if (env.id === "petra") {
    drawDune(ctx, rl - 50, ch * .55 + (g.bgOff * .1) % 80, 60, 40, "#E0BE8E");
    drawDune(ctx, rr - 10, ch * .7 + (g.bgOff * .13) % 80, 70, 46, "#D8B47E");
  } else {
    drawDune(ctx, rl - 40, ch * .6 + (g.bgOff * .1) % 60, 55, 28, "#E8D4A0");
    drawDune(ctx, rr + 5, ch * .5 + (g.bgOff * .12) % 60, 60, 30, "#E2CC96");
  }
}

      // ── ROAD ──
      const rd = ctx.createLinearGradient(rl, 0, rr, 0);
      rd.addColorStop(0, env.roadColor); rd.addColorStop(.15, lighten(env.roadColor, 8)); rd.addColorStop(.5, lighten(env.roadColor, 12)); rd.addColorStop(.85, lighten(env.roadColor, 8)); rd.addColorStop(1, env.roadColor);
      ctx.fillStyle = rd; ctx.fillRect(rl, 0, rw, ch);
      // road texture
      ctx.fillStyle = "rgba(0,0,0,0.02)"; for (let ry = 0; ry < ch; ry += 6) { ctx.fillRect(rl, ry + ((ry / 6) % 2) * 3, rw, 1); }
      // lane dashes
      ctx.strokeStyle = "#f5c518"; ctx.lineWidth = 2; ctx.setLineDash([20, 16]); ctx.lineDashOffset = -g.roadOff;
      for (let i = 1; i < 3; i++) { const lx = rl + i * lw; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ch); ctx.stroke(); }
      ctx.setLineDash([]);
      // road edges
      ctx.strokeStyle = "#f0ece0"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(rl + 3, 0); ctx.lineTo(rl + 3, ch); ctx.moveTo(rr - 3, 0); ctx.lineTo(rr - 3, ch); ctx.stroke();
      // road markings
      g.rms.forEach(rm => { if (rm.type === "zebra") { const sw = rw / 10; for (let i = 0; i < 10; i += 2) { ctx.fillStyle = "#fff"; ctx.fillRect(rl + i * sw, rm.y, sw, 14); } } else if (rm.type === "stop_line") { ctx.fillStyle = "#fff"; ctx.fillRect(rl, rm.y, rw, 4); } });

      // ── BUILDINGS ──
      // ── BUILDINGS ──
g.bldgs.forEach(b => {
  if (b.y > -b.h - 30 && b.y < ch + 20) {
    // لا نرسم مباني على الجانب الأيسر إذا كان البحر موجوداً
    if (env.hasSea && b.side === "L") return;
    drawBldg(ctx, b, b.side === "L" ? rl : rr);
  }
});

      // ── TREES ──
      // ── TREES ──
g.trees.forEach(tr => {
  if (tr.y < -80 || tr.y > ch + 20) return;
  // لا نرسم أشجار على اليسار إذا كان البحر موجوداً
  if (env.hasSea && tr.x < rl) return;
  drawTree(ctx, tr);
});

      // ── STREET LIGHTS ──
      // ── STREET LIGHTS ──
g.lights.forEach(l => {
  if (l.y > -60 && l.y < ch + 20) {
    // لا نرسم أعمدة على اليسار إذا كان البحر موجوداً
    if (env.hasSea && l.x < rl) return;
    drawSL(ctx, l.x, l.y + 50);
  }
});

      // ── GOV SIGNS ──
      
      // ── GOV SIGNS ──
g.govs.forEach(gv => {
  if (gv.y > -60 && gv.y < ch + 20) {
    // لا نرسم لوحات على اليسار إذا كان البحر موجوداً
    if (env.hasSea && gv.side === "L") return;
    drawGovSignBox(ctx, gv.x, gv.y, gv.dest, gv.km, gv.side);
  }
});

      // ── LANDMARKS (city-specific) ──
      g.landmarks.forEach(lm => {
        if (lm.y < -250 || lm.y > ch + 50) return;
        const lx = lm.side === "L" ? rl - 140 : rr + 20;
        if (lm.kind === "petra_treasury") drawPetraTreasury(ctx, lx, lm.y, 120, 110);
        else if (lm.kind === "amman_citadel") drawAmmanCitadel(ctx, lx, lm.y, 100, 80);
        else if (lm.kind === "irbid_arch") drawIrbidArchway(ctx, lx + 40, lm.y + 60);
        else if (lm.kind === "aqaba_fort") drawAqabaFort(ctx, lx, lm.y, 90, 70);
        else if (lm.kind === "aqaba_flag") drawAqabaFlag(ctx, lx + 30, lm.y + 90);
      });

      // ── INTERSECTIONS ──
      g.inters.forEach(inter => {
        const top = inter.y, bot = inter.y + inter.width; if (bot < -20 || top > ch + 20) return;
        ctx.fillStyle = darken(env.roadColor, 4); ctx.fillRect(0, top, cw, inter.width);
        ctx.strokeStyle = "#f0ece0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.lineTo(cw, top + 2); ctx.moveTo(0, bot - 2); ctx.lineTo(cw, bot - 2); ctx.stroke();
        const hlw = inter.width / 2; ctx.strokeStyle = "#f5c518"; ctx.lineWidth = 1.8; ctx.setLineDash([14, 10]);
        ctx.beginPath(); ctx.moveTo(0, top + hlw); ctx.lineTo(rl, top + hlw); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rr, top + hlw); ctx.lineTo(cw, top + hlw); ctx.stroke(); ctx.setLineDash([]);
        const sw = rw / 10; for (let i = 0; i < 10; i += 2) { ctx.fillStyle = "#fff"; ctx.fillRect(rl + i * sw, bot + 4, sw, 12); }
        for (let i = 0; i < 10; i += 2) { ctx.fillStyle = "#fff"; ctx.fillRect(rl + i * sw, top - 16, sw, 12); }
        drawTLBox(ctx, rr + 14, bot + 8, inter.lightState);
        inter.crossTraffic.forEach(car2 => { if (car2.y > top && car2.y < bot && car2.x > -80 && car2.x < cw + 80) drawHCar(ctx, car2.x, car2.y, car2.w, car2.h, car2.color); });
      });

      // ── ROUNDABOUTS ──
      g.roundabouts.forEach(rb => {
        if (rb.y < -rb.outerR * 2 - 50 || rb.y > ch + rb.outerR + 50) return;
        drawRoundabout(ctx, rb, env.roadColor);
      });

      // ── OBSTACLES ──
      g.obs.forEach(o => {
        if (!o.active) return; const cx2 = o.x + o.w / 2;
        switch (o.kind) {
          case "pothole": drawPothole(ctx, o.x, o.y, o.w, o.h); break;
          case "speedbump": drawSpeedbump(ctx, o.x, o.y, o.w); break;
          case "pedestrian": drawPedestrian(ctx, cx2, o.y + 14, (o.data?.dir as number) || 1, o.hit); break;
          case "cat": drawCat(ctx, cx2, o.y + 8, (o.data?.dir as number) || 1); break;
          case "camel": drawCamel(ctx, cx2, o.y + 10, (o.data?.dir as number) || 1); break;
          case "cone": drawCone(ctx, cx2, o.y + o.h); break;
          case "slow_car": drawHCar(ctx, o.x, o.y, o.w, o.h, (o.data?.color as string) || "#2563EB"); break;
          case "speed_sign": drawSpeedSign(ctx, cx2, o.y + 16, (o.data?.limit as number) || 60); break;
          case "stop_sign": drawStopSignBox(ctx, cx2, o.y + 16); break;
        }
      });

      // ── PARTICLES ──
      g.ptcs.forEach(p => { ctx.globalAlpha = p.life / p.ml; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;

      // ── PARKING ZONE ──
      if (ph === "parking" && !g.parking.confirmed) { parkAlignRef.current = drawParkingZone(ctx, g.parking, g.px, g.py, g.pw, g.ph); setParkAlign(Math.round(parkAlignRef.current * 100)); }

      // ── PLAYER CAR ──
      drawPlayerCar(ctx, g.px, g.py, g.pw, g.ph, g.speed, g.lb, g.rb, g.bt, car);

      // ── FLASH MESSAGE ──
      if (g.flashMsg && (ph === "playing" || ph === "parking")) {
        const colors = { pen: "rgba(239,68,68,0.9)", rew: "rgba(34,197,94,0.9)", warn: "rgba(245,158,11,0.95)", info: "rgba(59,130,246,0.9)" };
        const txtC = { pen: "#fecaca", rew: "#bbf7d0", warn: "#fef3c7", info: "#bfdbfe" };
        ctx.fillStyle = colors[g.flashType] || colors.info; ctx.beginPath(); ctx.roundRect(cw / 2 - 170, 14, 340, 40, 12); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(cw / 2 - 170, 14, 340, 40, 12); ctx.stroke();
        ctx.fillStyle = txtC[g.flashType] || "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText(g.flashMsg, cw / 2, 39);
      }

      // ── GAME LOGIC ──
      if (ph === "playing") {
        g.bt++; if (g.sigT > 0) { g.sigT--; if (g.sigT === 0) { g.lb = false; g.rb = false; } } if (g.hornT > 0) g.hornT -= dt;

        // Update ocean waves
        g.oceanWaves.forEach(w => { w.offset += w.speed * dt; });

        const keys = keysRef.current; const touch = touchRef.current; const wasZero = g.speed === 0;
        const accUp = keys.has("ArrowUp") || touch["up"];
        const accDown = keys.has(" ") || keys.has("ArrowDown") || touch["down"];
        const goLeft = keys.has("ArrowLeft") || touch["left"];
        const goRight = keys.has("ArrowRight") || touch["right"];
        const sigL = keys.has("z") || keys.has("Z") || touch["sigL"];
        const sigR = keys.has("x") || keys.has("X") || touch["sigR"];
        const hornP = keys.has("h") || keys.has("H") || touch["horn"];

        const maxSpd = 6 * car.accelMul;
        if (accUp) g.speed = Math.min(g.speed + .14 * car.accelMul, maxSpd);
        else if (accDown) { g.speed = Math.max(g.speed - .35, 0); if (g.speed > 0) sndRef.current?.playBrake(); }
        else g.speed = Math.min(g.speed + .03, 4.5 * car.accelMul);
        if (wasZero && g.speed > 0.1) sndRef.current?.playTick();
        sndRef.current?.updateEngine(g.speed);
        if (hornP && g.hornT <= 0) { g.hornT = 40; sndRef.current?.playHorn(); }

        // Indicator keys - always process when playing
        if (sigL) {
          if (!g.lb) {
            g.lb = true; g.rb = false; g.sigT = 45; sndRef.current?.playIndicator();
          }
        }
        if (sigR) {
          if (!g.rb) {
            g.rb = true; g.lb = false; g.sigT = 45; sndRef.current?.playIndicator();
          }
        }

        if (goLeft && !g.lcIng && g.currentLane > 0) { g.targetLane = g.currentLane - 1; g.lcIng = true; g.lcT = 0; g.lb = true; g.rb = false; g.sigT = 60; g.sigUsed = true; sndRef.current?.playIndicator(); }
        if (goRight && !g.lcIng && g.currentLane < 2) { g.targetLane = g.currentLane + 1; g.lcIng = true; g.lcT = 0; g.rb = true; g.lb = false; g.sigT = 60; g.sigUsed = true; sndRef.current?.playIndicator(); }
        if (g.lcIng) { g.lcT += dt * .08 * car.handlingMul; const tt = Math.min(g.lcT, 1); const e = tt < .5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2; g.px = LANES[g.currentLane] + (LANES[g.targetLane] - LANES[g.currentLane]) * e; if (tt >= 1) { g.currentLane = g.targetLane; g.lcIng = false; } }
        else { g.px += (LANES[g.currentLane] - g.px) * .08; }
        g.px = Math.max(rl + 4, Math.min(rr - g.pw - 4, g.px));

        setSpeed(Math.floor(g.speed * 20));
        setCurrentLane(g.currentLane);

        const vs = g.speed * dt * 1.2;
        g.roadOff = (g.roadOff + vs) % 36; g.bgOff = (g.bgOff + vs * .6) % 5000; g.dist += g.speed * dt * .4; setDist(Math.floor(g.dist));
        const scrArr = (arr: { y: number }[]) => arr.forEach(o => o.y += vs * .75);
        scrArr(g.trees); scrArr(g.lights); scrArr(g.govs); scrArr(g.bldgs); scrArr(g.landmarks); g.rms.forEach(rm => rm.y += vs);
        g.trees = g.trees.filter(t2 => t2.y < ch + 30);
        while (g.trees.length < 16) { const side = Math.random() > .5 ? "L" : "R"; const tp = env.treeTypes[Math.floor(Math.random() * env.treeTypes.length)]; g.trees.push({ x: side === "L" ? rl - 12 - Math.random() * 20 : rr + 12 + Math.random() * 20, y: -(60 + Math.random() * 50), scale: .4 + Math.random() * .3, type: tp }); }
        g.lights = g.lights.filter(l => l.y < ch + 30);
        while (g.lights.length < 8) g.lights.push({ x: Math.random() > .5 ? rl - 3 : rr + 3, y: -(40 + Math.random() * 30) });
        g.govs = g.govs.filter(gv => gv.y < ch + 30);
        g.bldgs = g.bldgs.filter(b => b.y < ch + 30);
        g.rms = g.rms.filter(rm => rm.y < ch + 30);
        g.landmarks = g.landmarks.filter(lm => lm.y < ch + 250);

        // ── INTERSECTIONS LOGIC ──
        g.inters.forEach(inter => {
          inter.y += vs * .75; inter.lightTimer += dt; const cyc = inter.cycleDuration; const phase2 = inter.lightTimer % cyc;
          if (phase2 < cyc * .45) inter.lightState = "green"; else if (phase2 < cyc * .55) inter.lightState = "yellow"; else inter.lightState = "red";
          if (inter.lightState === "red" && inter.lightTimer - inter.lastSpawn > 50) { inter.lastSpawn = inter.lightTimer; const fromL = Math.random() > .5; const ly = inter.y + (fromL ? inter.width * .25 : inter.width * .75); inter.crossTraffic.push({ id: Date.now() + Math.random(), x: fromL ? -60 : cw + 10, y: ly - 10, w: 52, h: 22, speed: (fromL ? 1 : -1) * (2 + Math.random() * 2), color: CAR_COLS[Math.floor(Math.random() * CAR_COLS.length)] }); }
          inter.crossTraffic.forEach(car2 => { car2.x += car2.speed * dt; }); inter.crossTraffic = inter.crossTraffic.filter(car2 => car2.x > -80 && car2.x < cw + 80);
          const stopY = inter.y + inter.width + 21; const inZ = stopY > g.py - 250 && stopY < g.py + 30; if (inZ) inter.approached = true;
          if (inter.approached && !inter.violated && !inter.scored) {
            if (stopY > g.py - 5) {
              if (inter.lightState === "red" && g.speed > .4) { inter.violated = true; pen("intersections", "تجاوزت الضوء الأحمر!"); pen("traffic_attention"); pen("sign_compliance"); }
              else if (inter.lightState === "red" && g.speed < .3) { inter.scored = true; rew("intersections", "ممتاز! وقفت عند الضوء الأحمر"); }
              else if (inter.lightState === "green") { inter.scored = true; }
              inter.approached = false;
            }
          }
          if (g.py < inter.y + inter.width + 30 && g.py + g.ph > inter.y - 10) {
            inter.crossTraffic.forEach(car2 => {
              if (g.px < car2.x + car2.w && g.px + g.pw > car2.x && g.py < car2.y + car2.h && g.py + g.ph > car2.y) {
                if (!inter.violated) { inter.violated = true; pen("vehicles", "اصطدمت بسيارة في التقاطع!"); pen("intersection_gap"); for (let i = 0; i < 12; i++) g.ptcs.push({ x: g.px + g.pw / 2, y: g.py, vx: (Math.random() - .5) * 6, vy: -Math.random() * 5, life: 45, ml: 45, color: "#ef4444", size: 3 + Math.random() * 3 }); }
              }
            });
          }
        });
        g.inters = g.inters.filter(i => i.y < ch + 150);

        // ── ROUNDABOUTS LOGIC ──
        g.roundabouts.forEach(rb => {
          rb.y += vs * .75;
          rb.cx = cw / 2; // always centered
          rb.cy = rb.y;
          // update circling cars
          rb.circCars.forEach(cc => {
            cc.angle += cc.speed * dt;
          });
          // spawn circling cars
          rb.spawnTimer += dt;
          if (rb.spawnTimer > 90 && rb.circCars.length < 3) {
            rb.spawnTimer = 0;
            rb.circCars.push({
              id: Date.now() + Math.random(),
              angle: Math.random() * Math.PI * 2,
              speed: 0.025 + Math.random() * 0.015,
              r: (rb.outerR + rb.innerR) / 2,
              w: 24, h: 14,
              color: CAR_COLS[Math.floor(Math.random() * CAR_COLS.length)],
            });
          }
          // remove circling cars occasionally
          if (rb.circCars.length > 0 && Math.random() < 0.001 * dt) rb.circCars.shift();

          // check if player enters roundabout
          const dx = (g.px + g.pw / 2) - rb.cx;
          const dy = (g.py + g.ph / 2) - rb.cy;
          const dist2 = Math.sqrt(dx * dx + dy * dy);
          const wasIn = g.inRoundabout && g.roundaboutId === rb.id;
          const nowIn = dist2 < rb.outerR + 10;

          if (nowIn && !wasIn) {
            g.inRoundabout = true; g.roundaboutId = rb.id; rb.entered = true;
            // Check if player used indicator before entering
            if (!g.lb && !g.rb) {
              pen("indicator_use", "لم تستخدم الغماز عند الدوار!");
            } else {
              rew("indicator_procedure", "ممتاز! استخدمت الغماز للدوار");
            }
            // Check if player yielded (slowed down)
            if (g.speed > 3 && rb.circCars.length > 0) {
              pen("intersections", "لم تعطِ الأولوية في الدوار!");
            } else if (rb.circCars.length > 0) {
              rew("intersections", "أحسنت! أعطيت الأولوية في الدوار");
            }
          }
          if (!nowIn && wasIn) {
            g.inRoundabout = false; g.roundaboutId = -1;
          }

          // collision with circling cars
          if (nowIn) {
            rb.circCars.forEach(cc => {
              const ccx = rb.cx + Math.cos(cc.angle) * cc.r - cc.w / 2;
              const ccy = rb.cy + Math.sin(cc.angle) * cc.r - cc.h / 2;
              if (g.px < ccx + cc.w && g.px + g.pw > ccx && g.py < ccy + cc.h && g.py + g.ph > ccy) {
                if (!rb.yielded) {
                  rb.yielded = true;
                  pen("vehicles", "اصطدمت بسيارة في الدوار!");
                  for (let i = 0; i < 10; i++) g.ptcs.push({ x: g.px + g.pw / 2, y: g.py, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, life: 40, ml: 40, color: "#ef4444", size: 2 + Math.random() * 3 });
                }
              }
            });
          }
        });
        g.roundabouts = g.roundabouts.filter(rb => rb.y < ch + rb.outerR * 2 + 100);

        // ── OBSTACLES LOGIC ──
        g.obs.forEach(o => { if (!o.active) return; o.y += vs * o.vy + o.vy * dt; o.x += o.vx * dt; if (o.kind === "pedestrian" || o.kind === "cat" || o.kind === "camel") o.x += ((o.data?.dir as number) * 1.2 * dt) || 0; });
        g.obs = g.obs.filter(o => o.y < ch + 60 && o.x > -80 && o.x < cw + 80);
        g.obs.forEach(o => {
          if (!o.active || o.hit) return;
          const hit = g.px < o.x + o.w && g.px + g.pw > o.x && g.py < o.y + o.h && g.py + g.ph > o.y;
          if (!hit) return; o.hit = true;
          for (let i = 0; i < 8; i++) g.ptcs.push({ x: g.px + g.pw / 2, y: g.py, vx: (Math.random() - .5) * 5, vy: -Math.random() * 4, life: 40, ml: 40, color: "#ef4444", size: 2 + Math.random() * 3 });
          switch (o.kind) { case "pothole": pen("road_conditions", "اصطدمت بحفرة!"); pen("steering_control"); break; case "speedbump": pen("road_conditions", "تجاهلت المطب!"); break; case "stop_sign": pen("stop_signs", "تجاهلت إشارة قف!"); break; case "pedestrian": pen("pedestrians", "اصطدمت بمشاة!"); break; case "cat": pen("road_env", "اصطدمت بقطة ضالة!"); break; case "camel": pen("road_env", "اصطدمت بجمل في الطريق!"); break; case "slow_car": pen("vehicles", "اصطدمت بمركبة!"); break; case "cone": pen("obstacles", "اصطدمت بمخروط!"); break; }
        });
        g.obs.forEach(o => {
          if (o.kind === "stop_sign" && o.active && !o.scored) { if (Math.abs(g.py - o.y) < 80 && g.speed < .3) { o.scored = true; rew("stop_signs", "وقفت عند إشارة القف"); } }
          if (o.kind === "pedestrian" && o.active && !o.scored) { if (Math.abs(g.py - o.y) < 80 && g.speed < .4) { o.scored = true; rew("pedestrians", "أعطيت الأولوية للمشاة"); } }
        });

        const offR = g.px < rl + 5 || g.px + g.pw > rr - 5;
        if (offR) { g.offRT += dt; if (g.offRT > 25) { pen("lane_keeping", "خروج عن المسار!"); pen("steering_control"); } } else g.offRT = Math.max(0, g.offRT - dt * .5);
        if (g.lcIng && !g.sigUsed) { pen("indicator_use", "نسيت الغماز!"); pen("indicator_procedure"); }
        const carAhead = g.obs.find(o => o.kind === "slow_car" && o.active && !o.hit && Math.abs(o.x - g.px) < 35 && o.y > g.py && o.y - g.py < 60);
        if (carAhead) { g.ttT += dt; if (g.ttT > 35) { pen("intersection_gap", "المسافة الأمنية غير كافية!"); } } else g.ttT = Math.max(0, g.ttT - dt);

        g.ptcs.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; p.life -= 2; }); g.ptcs = g.ptcs.filter(p => p.life > 0);
        if (g.flashT > 0) { g.flashT -= dt; if (g.flashT <= 0) { g.flashMsg = ""; setFMsg(""); } }

        // ── SPAWNING ──
        if (g.dist >= g.niDist) { spawnInter(g, cw, ch, rl, rr, rw, lw); g.niDist += 2000 + Math.random() * 1200; }
        if (g.dist >= g.nrDist) { spawnRoundabout(g, cw, ch, rl, rr); g.nrDist += (env.roundaboutFreq === 1 ? 1200 : env.roundaboutFreq === 2 ? 2000 : 3500) + Math.random() * 800; }
        if (g.dist >= g.noDist) { spawnObs(g, cw, ch, rl, rr, rw, lw, LANES, env); g.noDist += 500 + Math.random() * 400; }
        if (g.dist >= g.nbDist) { spawnBldg(g, cw, ch, rl, rr, env); g.nbDist += 250 + Math.random() * 200; }
        if (g.dist >= g.ntDist && g.govs.length < 2) {
          const govs = [{ dest: "إربد", km: 80 }, { dest: "العقبة", km: 330 }, { dest: "عمّان", km: 0 }, { dest: "البتراء", km: 230 }];
          const gv = govs[Math.floor(Math.random() * govs.length)]; const side = Math.random() > .5 ? "L" : "R";
          g.govs.push({ x: side === "L" ? rl - 6 : rr + 6, y: -(200 + Math.random() * 300), dest: gv.dest, km: gv.km, side }); g.ntDist += 8000 + Math.random() * 5000;
        }
        // city landmarks
        if (g.dist >= g.nlDist) {
          spawnLandmark(g, env, rl, rr);
          g.nlDist += 5000 + Math.random() * 2000;
        }

        // Ocean sound management
        if (env.hasSea) {
          if (!sndRef.current?.oceanGain) sndRef.current?.startOcean();
        }

        if (g.dist >= TARGET_DIST) startParking();
      }

      // ── PARKING PHASE ──
      if (ph === "parking" && !g.parking.confirmed) {
        const touch = touchRef.current; const keys2 = keysRef.current; const mv = 1.8 * dt * car.handlingMul;
        if (keys2.has("ArrowLeft") || touch["left"]) g.px -= mv;
        if (keys2.has("ArrowRight") || touch["right"]) g.px += mv;
        if (keys2.has("ArrowUp") || touch["up"]) g.py -= mv;
        if (keys2.has("ArrowDown") || touch["down"]) g.py += mv;
        g.px = Math.max(rl + 4, Math.min(rr - g.pw - 4, g.px)); g.py = Math.max(20, Math.min(ch - g.ph - 60, g.py));
        parkTimerRef.current -= dt; if (parkTimerRef.current <= 0) { parkTimerRef.current = 0; confirmParking(); }
        setParkTimer(Math.ceil(parkTimerRef.current / 60));
        // Ocean waves still animate in parking
        if (env.hasSea) g.oceanWaves.forEach(w => { w.offset += w.speed * dt; });
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd, { capture: true });
      window.removeEventListener("keyup", ku, { capture: true });
      snd.destroy(); sndRef.current = null;
    };
  }, [pen, rew, flash, startParking, confirmParking]);

  function spawnInter(g: GS, cw: number, ch: number, rl: number, rr: number, rw: number, lw: number) {
    const sp = Math.random() > .5 ? 0 : .45;
    g.inters.push({ id: Date.now(), y: -120, width: 85, lightState: sp === 0 ? "green" : "red", lightTimer: sp * 360 || 0, cycleDuration: 360 + Math.random() * 80, crossTraffic: [], scored: false, violated: false, approached: false, lastSpawn: 0 });
    g.rms.push({ y: -120 + 85 + 4, type: "zebra" }); g.rms.push({ y: -120 + 85 + 18, type: "stop_line" }); g.rms.push({ y: -120 - 16, type: "zebra" });
  }

  function spawnRoundabout(g: GS, cw: number, ch: number, rl: number, rr: number) {
    const cx = (rl + rr) / 2;
    const outerR = (rr - rl) / 2 + 20;
    const innerR = outerR * 0.38;
    g.roundabouts.push({
      id: Date.now(), y: -outerR - 80,
      cx, cy: -outerR - 80,
      outerR, innerR,
      circCars: [
        { id: 1, angle: 0, speed: 0.022, r: (outerR + innerR) / 2, w: 24, h: 14, color: CAR_COLS[0] },
        { id: 2, angle: Math.PI, speed: 0.028, r: (outerR + innerR) / 2, w: 24, h: 14, color: CAR_COLS[2] },
      ],
      scored: false, entered: false, yielded: false, lastSpawn: 0, spawnTimer: 0,
    });
  }

  function spawnObs(g: GS, cw: number, ch: number, rl: number, rr: number, rw: number, lw: number, LANES: number[], env: EnvDef) {
    const id = Date.now(); const lane = Math.floor(Math.random() * 3); const lx = LANES[lane];
    const kinds = ["pothole", "speedbump", "slow_car", "pedestrian", "cat", "cone", "stop_sign", "speed_sign"];
    if (env.hasPetra || env.hasFarm || env.hasSand) kinds.push("camel");
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const base = { id, active: true, hit: false, scored: false, vy: 1, vx: 0 };
    switch (kind) {
      case "pothole": g.obs.push({ ...base, kind, x: lx + 2, y: -40, w: 30, h: 14 }); break;
      case "speedbump": g.obs.push({ ...base, kind, x: rl, y: -25, w: rw, h: 10 }); break;
      case "slow_car": g.obs.push({ ...base, kind, x: lx, y: -160, w: 36, h: 64, vy: .4, data: { color: CAR_COLS[Math.floor(Math.random() * CAR_COLS.length)] } }); break;
      case "pedestrian": { const d = Math.random() > .5 ? 1 : -1; const py = ch * .2 + Math.random() * ch * .3; g.obs.push({ ...base, kind, x: d > 0 ? rl - 15 : rr + 5, y: py, w: 16, h: 32, vx: 0, vy: 0, data: { dir: d } }); g.rms.push({ y: py, type: "zebra" }); break; }
      case "cat": { const d = Math.random() > .5 ? 1 : -1; g.obs.push({ ...base, kind, x: d > 0 ? rl - 10 : rr, y: -60, w: 14, h: 12, vx: 0, vy: 1, data: { dir: d } }); break; }
      case "camel": { const d = Math.random() > .5 ? 1 : -1; g.obs.push({ ...base, kind, x: lx, y: -100, w: 36, h: 30, vy: .6, data: { dir: d } }); break; }
      case "cone": g.obs.push({ ...base, kind, x: lx, y: -60, w: 16, h: 24 }); break;
      case "stop_sign": g.obs.push({ ...base, kind, x: rr - 40, y: -130, w: 30, h: 55 }); g.rms.push({ y: -75, type: "stop_line" }); break;
      case "speed_sign": g.obs.push({ ...base, kind, x: rr - 40, y: -110, w: 34, h: 42, data: { limit: [40, 60, 80][Math.floor(Math.random() * 3)] } }); break;
    }
  }

  function spawnBldg(g: GS, cw: number, ch: number, rl: number, rr: number, env: EnvDef) {
    const side = Math.random() > .5 ? "L" : "R"; const sw = side === "L" ? rl - 4 : cw - rr - 4; const tmpl = env.blds[Math.floor(Math.random() * env.blds.length)];
    const bw = Math.min(tmpl.type === "university" || tmpl.type === "school" ? sw * .7 : sw * .5, sw * .75);
    const bh = tmpl.type === "university" ? 70 : tmpl.type === "school" ? 55 : tmpl.type === "gov" ? 60 : tmpl.type === "mosque" ? 55 : tmpl.type === "hotel" || tmpl.type === "resort" ? 65 : 40 + Math.random() * 15;
    g.bldgs.push({ y: -(40 + Math.random() * 30), side, label: tmpl.label, sub: tmpl.sub, w: bw, h: bh, color: tmpl.color, awc: tmpl.awc, hasAw: tmpl.hasAw, type: tmpl.type });
  }

  function spawnLandmark(g: GS, env: EnvDef, rl: number, rr: number) {
    const side: "L" | "R" = Math.random() > .5 ? "L" : "R";
    let kind = "";
    if (env.id === "petra") kind = "petra_treasury";
    else if (env.id === "amman") kind = "amman_citadel";
    else if (env.id === "irbid") kind = "irbid_arch";
    else if (env.id === "aqaba") kind = Math.random() > .5 ? "aqaba_fort" : "aqaba_flag";
    if (kind) g.landmarks.push({ y: -(200 + Math.random() * 200), kind, side });
  }

  const resetGame = () => {
    const ng = mkGS(); const env = envRef.current; const r = canvasRef.current?.getBoundingClientRect();
    if (r) {
      const cw = r.width, ch = r.height, rl = cw * .35, rr = cw * .65, lw = (rr - rl) / 3;
      ng.px = rl + lw / 2 - 18; ng.py = ch - 120;
      for (let i = 0; i < 8; i++) { const side = Math.random() > .5 ? "L" : "R"; const tp = env.treeTypes[Math.floor(Math.random() * env.treeTypes.length)]; ng.trees.push({ x: side === "L" ? rl - 12 - Math.random() * 20 : rr + 12 + Math.random() * 20, y: -60 - i * 180, scale: .4 + Math.random() * .3, type: tp }); }
      for (let i = 0; i < 6; i++) ng.lights.push({ x: i % 2 === 0 ? rl - 3 : rr + 3, y: -40 - i * 250 });
      for (let i = 0; i < 4; i++) spawnBldg(ng, cw, ch, rl, rr, env);
    }
    gsRef.current = ng; const ns = mkSc(); scRef.current = ns; setSc({ ...ns }); setDist(0); setFMsg(""); setShowPanel(true); setScoreRevealed(false);
  };

  const startGame = () => {
    envRef.current = ENVIRONMENTS.find(e => e.id === selectedEnv) || ENVIRONMENTS[0];
    carRef.current = CARS.find(c => c.id === selectedCar) || CARS[0];
    if (!sndRef.current) { sndRef.current = new SoundEngine(); }
    sndRef.current.init(); sndRef.current.setMuted(muted); sndRef.current.resume();
    if (envRef.current.hasSea && !muted) sndRef.current.startOcean();
    resetGame(); phRef.current = "playing"; setPhase("playing");
  };
  const toggleMute = () => { const m = !muted; setMuted(m); sndRef.current?.setMuted(m); };

  /* Touch controls */
  const touchPress = (key: string) => (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); touchRef.current[key] = true; };
  const touchRelease = (key: string) => (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); touchRef.current[key] = false; };
  const touchTap = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); touchRef.current[key] = true;
    setTimeout(() => { touchRef.current[key] = false; }, 50);
  };

  const totalSc = SCORES.reduce((s, i) => s + sc[i.key], 0);
  const maxSc = SCORES.reduce((s, i) => s + i.max, 0);
  const passed = totalSc >= 75;
  const prog = Math.min(dist / TARGET_DIST * 100, 100);
  const secData = [1, 2, 3, 4, 5, 6, 7, 8].map(s => { const items = SCORES.filter(i => i.section === s); return { sec: s, name: SEC_NAMES[s], scored: items.reduce((a, i) => a + sc[i.key], 0), max: items.reduce((a, i) => a + i.max, 0) }; });

  const goBackToIdle = () => {
    phRef.current = "idle"; setPhase("idle"); setShowPanel(true); setScoreRevealed(false);
    keysRef.current.clear(); touchRef.current = {};
    sndRef.current?.stopEngine(); sndRef.current?.stopOcean();
  };
  const goBackTo = (p: GamePhase) => { phRef.current = p; setPhase(p); };

  return (
    <div className="fixed inset-0 bg-[#0c0f1a] overflow-hidden select-none" style={{ fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Back button */}
      {phase !== "idle" && phase !== "finished" && (
        <button
          onClick={() => {
            if (phase === "selectEnv") goBackToIdle();
            else if (phase === "selectCar") goBackTo("selectEnv");
            else if (phase === "playing" || phase === "parking") goBackToIdle();
          }}
          className="absolute left-3 top-3 z-40 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all active:scale-90"
        >
          <span className="text-lg">→</span>
        </button>
      )}

      {(phase === "playing" || phase === "parking") && (
        <button onClick={toggleMute} className="absolute left-3 bottom-16 z-20 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all active:scale-90">
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {/* Score panel */}
      {showPanel && phase === "playing" && (
        <div className="absolute right-0 top-0 bottom-14 w-60 bg-[#0c0f1a]/80 backdrop-blur-xl border-l border-white/[0.06] overflow-y-auto p-3 z-20" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /><span className="text-[10px] font-bold text-amber-300/90 uppercase tracking-[0.2em]">تقييم مباشر</span></div><button onClick={() => setShowPanel(false)} className="text-white/30 hover:text-white/70 text-xs transition-colors">✕</button></div>
          {secData.map(s => { const p = s.max > 0 ? s.scored / s.max * 100 : 0; return (<div key={s.sec} className="mb-2.5 group"><div className="flex justify-between text-[9px] mb-1"><span className="text-white/40 group-hover:text-white/60 transition-colors">{s.sec}. {s.name}</span><span className={`font-bold tabular-nums ${p >= 75 ? "text-emerald-400" : p >= 50 ? "text-amber-400" : "text-red-400"}`}>{s.scored}/{s.max}</span></div><div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${p}%`, background: p >= 75 ? "linear-gradient(90deg,#059669,#34d399)" : p >= 50 ? "linear-gradient(90deg,#d97706,#fbbf24)" : "linear-gradient(90deg,#dc2626,#f87171)" }} /></div></div>); })}
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">{SCORES.map(si => { const v = sc[si.key], f = v === 0; return (<div key={si.key} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all ${f ? "bg-red-500/[0.08] border border-red-500/10" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"}`}><span className={`text-[8px] leading-tight transition-colors ${f ? "text-red-400/80 line-through" : "text-white/35"}`} dir="rtl">{f ? "✗" : "✓"} {si.label}</span><span className={`text-[8px] font-bold tabular-nums shrink-0 ml-2 ${f ? "text-red-400" : "text-white/20"}`}>{v}/{si.max}</span></div>); })}</div>
          <div className="mt-3 pt-3 border-t border-white/[0.06]"><div className="relative h-2.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg,#dc2626 0%,#f59e0b 50%,#22c55e 75%,#059669 100%)" }} /><div className="absolute top-0 h-full w-[2px] bg-white/40" style={{ left: "75%" }} /><div className="absolute top-[-2px] h-[calc(100%+4px)] w-2 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-700" style={{ left: `${Math.min(totalSc / maxSc * 100, 100)}%`, transform: "translateX(-50%)" }} /></div><p className="text-[8px] text-white/20 mt-1.5 text-center">حد النجاح 75/100</p></div>
        </div>
      )}

      {!showPanel && phase === "playing" && (<button onClick={() => setShowPanel(true)} className="absolute right-3 top-3 z-20 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/70 transition-all active:scale-90">📊</button>)}

      {/* HUD - playing */}
      {phase === "playing" && (
        <div className="absolute top-3 left-16 right-[260px] flex items-start justify-between pointer-events-none z-10">
          <div className="space-y-2">
            <div className="px-4 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20">
              <p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">المسافة</p>
              <p className="text-lg font-extrabold text-white font-mono tabular-nums">{dist.toLocaleString()} <span className="text-[10px] text-white/30 font-normal">م</span></p>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20">
              <p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">السرعة</p>
              <div className="flex items-end gap-1"><p className="text-2xl font-extrabold text-white font-mono tabular-nums">{speed}</p><p className="text-[9px] text-white/25 mb-1">كم/س</p></div>
              <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(speed / 120 * 100, 100)}%`, background: speed > 90 ? "#ef4444" : speed > 60 ? "#f59e0b" : "#22c55e" }} /></div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06]">
              <p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-1">المسرب</p>
              <div className="flex gap-1.5">{[0, 1, 2].map(i => (<div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${currentLane === i ? "bg-amber-400 shadow-md shadow-amber-400/30" : "bg-white/[0.08]"}`} />))}</div>
            </div>
            {envRef.current.hasSea && (
              <div className="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/20">
                <p className="text-[8px] text-sky-300">🌊 منطقة ساحلية</p>
              </div>
            )}
            {gsRef.current.inRoundabout && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/20 animate-pulse">
                <p className="text-[8px] text-amber-300">🔄 داخل الدوار — أعطِ الأولوية!</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20">
              <p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">العلامة الحالية</p>
              <div className="flex items-end justify-end gap-1.5"><p className={`text-4xl font-black font-mono tabular-nums ${passed ? "text-emerald-300" : totalSc < 50 ? "text-red-300" : "text-amber-300"}`}>{totalSc}</p><p className="text-xs text-white/20 mb-1.5">/ {maxSc}</p></div>
              <div className={`text-[10px] font-bold mt-1 ${passed ? "text-emerald-400/70" : "text-red-400/60"}`}>{passed ? "✓ فوق حد النجاح" : "✗ تحت حد النجاح"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar - playing */}
      {phase === "playing" && (
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-[#0c0f1a]/85 backdrop-blur-2xl border-t border-white/[0.06] flex items-center px-5 gap-5 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[8px] text-white/25 mb-1"><span>تقدّم الفحص</span><span className="tabular-nums">{prog.toFixed(1)}%</span></div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${prog}%`, background: "linear-gradient(90deg,#d97706,#f59e0b,#fbbf24)" }} /></div>
            <p className="text-[8px] text-white/20 mt-0.5 tabular-nums">{dist.toLocaleString()} / {TARGET_DIST.toLocaleString()} م</p>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2.5 text-[8px] text-white/30 shrink-0">
              {([["↑", "تسارع"], ["↓", "فرملة"], ["Space", "طوارئ"], ["←→", "مسرب"], ["Z", "غماز←"], ["X", "غماز→"], ["H", "بوق"]] as [string, string][]).map(([k, l]) => (
                <div key={k} className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] font-mono text-white/40 text-[7px]">{k}</kbd><span className="hidden xl:inline">{l}</span></div>
              ))}
            </div>
          )}
          <button onClick={() => { startParking(); }} className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 text-[10px] font-bold transition-all active:scale-95 shrink-0 whitespace-nowrap">⏹ إنهاء الفحص</button>
        </div>
      )}

      {/* ═══ MOBILE CONTROLS — Redesigned UX ═══ */}
      {isMobile && (phase === "playing" || phase === "parking") && (
        <div className="absolute inset-0 z-30 pointer-events-none">

          {/* TOP ROW — Indicators + Horn (above left/right arrows) */}
          {phase === "playing" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
              {/* Left indicator */}
              <button
                onTouchStart={touchPress("sigL")} onTouchEnd={touchRelease("sigL")} onTouchCancel={touchRelease("sigL")}
                onMouseDown={touchPress("sigL")} onMouseUp={touchRelease("sigL")} onMouseLeave={touchRelease("sigL")}
                className="w-14 h-12 rounded-2xl bg-amber-500/25 backdrop-blur-md border border-amber-400/30 flex flex-col items-center justify-center gap-0.5 active:bg-amber-500/50 active:scale-95 transition-all shadow-lg shadow-amber-500/10"
              >
                <span className="text-amber-200 text-xl font-bold">⟸</span>
                <span className="text-amber-200/60 text-[8px]">Z</span>
              </button>
              {/* Horn */}
              <button
                onTouchStart={touchTap("horn")} onMouseDown={touchTap("horn")}
                className="w-14 h-12 rounded-2xl bg-sky-500/25 backdrop-blur-md border border-sky-400/30 flex flex-col items-center justify-center gap-0.5 active:bg-sky-500/50 active:scale-95 transition-all shadow-lg shadow-sky-500/10"
              >
                <span className="text-sky-200 text-lg">📢</span>
                <span className="text-sky-200/60 text-[8px]">H</span>
              </button>
              {/* Right indicator */}
              <button
                onTouchStart={touchPress("sigR")} onTouchEnd={touchRelease("sigR")} onTouchCancel={touchRelease("sigR")}
                onMouseDown={touchPress("sigR")} onMouseUp={touchRelease("sigR")} onMouseLeave={touchRelease("sigR")}
                className="w-14 h-12 rounded-2xl bg-amber-500/25 backdrop-blur-md border border-amber-400/30 flex flex-col items-center justify-center gap-0.5 active:bg-amber-500/50 active:scale-95 transition-all shadow-lg shadow-amber-500/10"
              >
                <span className="text-amber-200 text-xl font-bold">⟹</span>
                <span className="text-amber-200/60 text-[8px]">X</span>
              </button>
            </div>
          )}

          {/* LEFT side — Lane change arrows (large, thumb-friendly) */}
          <div className="absolute bottom-20 left-3 flex gap-2.5 pointer-events-auto">
            <button
              onTouchStart={touchPress("left")} onTouchEnd={touchRelease("left")} onTouchCancel={touchRelease("left")}
              onMouseDown={touchPress("left")} onMouseUp={touchRelease("left")} onMouseLeave={touchRelease("left")}
              className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center active:bg-amber-500/40 active:scale-95 transition-all shadow-lg"
            >
              <span className="text-white text-4xl leading-none">←</span>
              <span className="text-white/40 text-[8px] mt-0.5">مسرب</span>
            </button>
            <button
              onTouchStart={touchPress("right")} onTouchEnd={touchRelease("right")} onTouchCancel={touchRelease("right")}
              onMouseDown={touchPress("right")} onMouseUp={touchRelease("right")} onMouseLeave={touchRelease("right")}
              className="w-[72px] h-[72px] rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center active:bg-amber-500/40 active:scale-95 transition-all shadow-lg"
            >
              <span className="text-white text-4xl leading-none">→</span>
              <span className="text-white/40 text-[8px] mt-0.5">مسرب</span>
            </button>
          </div>

          {/* RIGHT side — Gas + Brake (vertical stack, large) */}
          <div className="absolute bottom-20 right-3 flex flex-col gap-2.5 pointer-events-auto">
            <button
              onTouchStart={touchPress("up")} onTouchEnd={touchRelease("up")} onTouchCancel={touchRelease("up")}
              onMouseDown={touchPress("up")} onMouseUp={touchRelease("up")} onMouseLeave={touchRelease("up")}
              className="w-[72px] h-[72px] rounded-2xl bg-emerald-500/25 backdrop-blur-md border border-emerald-400/30 flex flex-col items-center justify-center gap-0.5 active:bg-emerald-500/50 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
            >
              <span className="text-emerald-200 text-3xl leading-none">↑</span>
              <span className="text-emerald-200/60 text-[8px]">غاز</span>
            </button>
            <button
              onTouchStart={touchPress("down")} onTouchEnd={touchRelease("down")} onTouchCancel={touchRelease("down")}
              onMouseDown={touchPress("down")} onMouseUp={touchRelease("down")} onMouseLeave={touchRelease("down")}
              className="w-[72px] h-[72px] rounded-2xl bg-red-500/25 backdrop-blur-md border border-red-400/30 flex flex-col items-center justify-center gap-0.5 active:bg-red-500/50 active:scale-95 transition-all shadow-lg shadow-red-500/10"
            >
              <span className="text-red-200 text-3xl leading-none">↓</span>
              <span className="text-red-200/60 text-[8px]">فرامل</span>
            </button>
          </div>

          {/* Parking confirm button */}
          {phase === "parking" && !gsRef.current.parking.confirmed && (
            <button
              onTouchEnd={(e) => { e.preventDefault(); confirmParking(); }}
              onMouseDown={() => confirmParking()}
              className="absolute bottom-[180px] left-1/2 -translate-x-1/2 pointer-events-auto px-8 py-3.5 rounded-2xl bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-sm font-bold active:scale-95 transition-all shadow-lg shadow-emerald-500/20 backdrop-blur-md"
            >✓ تأكيد الاصطفاف</button>
          )}

          {/* Compact speed indicator for mobile */}
          {phase === "playing" && (
            <div className="absolute top-20 right-3 pointer-events-none">
              <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-center min-w-[52px]">
                <p className="text-[7px] text-white/30 uppercase">كم/س</p>
                <p className={`text-xl font-black font-mono tabular-nums ${speed > 90 ? "text-red-300" : speed > 60 ? "text-amber-300" : "text-white"}`}>{speed}</p>
              </div>
              <div className="mt-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-center min-w-[52px]">
                <p className="text-[7px] text-white/30 uppercase">علامة</p>
                <p className={`text-lg font-black font-mono tabular-nums ${passed ? "text-emerald-300" : "text-red-300"}`}>{totalSc}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parking overlay */}
      {phase === "parking" && !gsRef.current.parking.confirmed && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-center">
            <p className="text-[9px] text-amber-300/60 uppercase tracking-[0.2em] font-bold mb-0.5">وقت الاصطفاف المتبقي</p>
            <p className={`text-4xl font-black font-mono tabular-nums ${parkTimer <= 10 ? "text-red-400 animate-pulse" : "text-white"}`}>{parkTimer}</p>
            <p className="text-[9px] text-white/25">ثانية</p>
          </div>
          <div className="absolute top-4 right-4 px-4 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-center">
            <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mb-0.5">جودة المحاذاة</p>
            <p className={`text-3xl font-black font-mono tabular-nums ${parkAlign >= 80 ? "text-emerald-400" : parkAlign >= 50 ? "text-amber-400" : "text-red-400"}`}>{parkAlign}%</p>
          </div>
          {!isMobile && (
            <>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 pointer-events-auto">
                <p className="text-[11px] text-white/50 text-center">استخدم <span className="text-amber-300 font-bold">الأسهم</span> لتحريك السيارة — ثم اضغط <span className="text-amber-300 font-bold">Enter</span> للتأكيد</p>
              </div>
              <button onClick={confirmParking} className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto px-8 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-bold transition-all active:scale-95">✓ تأكيد الاصطفاف</button>
            </>
          )}
        </div>
      )}

      {/* ═══ IDLE SCREEN ═══ */}
      {phase === "idle" && (
        <div className="absolute inset-0 bg-[#0c0f1a]/90 backdrop-blur-2xl flex items-center justify-center z-30 overflow-y-auto py-6">
          <div className="text-center px-6 max-w-2xl w-full">
            <div className="relative mx-auto mb-6 w-24 h-24">
              <div className="absolute inset-0 rounded-3xl bg-amber-500/10 border border-amber-400/20 rotate-6 animate-pulse" />
              <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-400/25 flex items-center justify-center shadow-2xl shadow-amber-500/10">
                <span className="text-6xl drop-shadow-lg">🇯🇴</span>
              </div>
            </div>
            <h2 className="text-4xl font-black text-white mb-1 tracking-tight">فحص القيادة الأردني</h2>
            <p className="text-sm text-slate-400 mb-2">محاكاة واقعية لشوارع الأردن مع دوارات وتقاطعات حية</p>
            <div className="flex justify-center gap-3 mb-6 flex-wrap">
              {["🏙️ عمّان", "🌿 إربد", "🏖️ العقبة", "🏛️ البتراء"].map(c => (
                <span key={c} className="text-[10px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50">{c}</span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2.5 mb-7">{secData.map(s => (<div key={s.sec} className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"><p className="font-bold text-white/70 text-[10px] leading-tight group-hover:text-white/90 transition-colors">{s.name}</p><p className="text-amber-400 font-bold mt-1 text-sm tabular-nums">{s.max} <span className="text-[9px] text-amber-400/40">علامة</span></p></div>))}</div>
            <div className="bg-white/[0.03] rounded-2xl p-5 mb-7 border border-white/[0.05]">
              <p className="text-[10px] text-amber-300/60 uppercase tracking-[0.2em] font-bold mb-3">أدوات التحكم</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/45 leading-8">
                <div><span className="text-amber-300 font-bold">↑ ↓</span> التسارع والفرملة</div>
                <div><span className="text-amber-300 font-bold">← →</span> تغيير المسرب</div>
                <div><span className="text-amber-300 font-bold">Space</span> فرملة طارئة</div>
                <div><span className="text-amber-300 font-bold">Z / X</span> غماز يسار / يمين</div>
                <div><span className="text-amber-300 font-bold">H</span> بوق السيارة</div>
                <div><span className="text-amber-300 font-bold">Esc</span> إنهاء الفحص</div>
              </div>
              <p className="text-[11px] text-white/25 mt-3">اقطع المسافة <span className="text-amber-300/70 font-bold">15,000 متر</span> ثم اصطفّ السيارة بعناية</p>
              <p className="text-[11px] text-white/25 mt-1">🔄 <span className="text-amber-300/50">دوارات</span> تظهر في كل المدن — أكثر كثافةً في إربد!</p>
              {isMobile && <p className="text-[11px] text-emerald-300/50 mt-2">📱 أزرار تحكم لمسية بتصميم محسّن تظهر تلقائياً</p>}
            </div>
            <button onClick={() => goBackTo("selectEnv")} className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative text-2xl">▶</span><span className="relative">ابدأ الفحص</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ ENV SELECTION ═══ */}
      {phase === "selectEnv" && (
        <div className="absolute inset-0 bg-[#0c0f1a]/92 backdrop-blur-2xl flex items-center justify-center z-30 overflow-y-auto py-10">
          <div className="text-center px-6 max-w-3xl w-full">
            <p className="text-[10px] text-amber-300/60 uppercase tracking-[0.25em] font-bold mb-2">الخطوة 1 من 2</p>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">اختر بيئة الفحص</h2>
            <p className="text-sm text-slate-400 mb-8">كل مدينة أردنية تحاكي طابعها الخاص بالمباني والطبيعة والمعالم</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {ENVIRONMENTS.map(env => (
                <button key={env.id} onClick={() => setSelectedEnv(env.id)}
                  className={`relative rounded-3xl p-5 border-2 text-right transition-all overflow-hidden ${selectedEnv === env.id ? "border-amber-400/60 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-[1.02]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"}`}
                >
                  <div className="absolute -left-4 -top-4 w-24 h-24 rounded-full opacity-10" style={{ background: `linear-gradient(135deg,${env.skyTop},${env.groundColor})` }} />
                  <div className="flex items-center gap-3 mb-2 relative">
                    <span className="text-4xl">{env.icon}</span>
                    <div>
                      <p className="text-xl font-black text-white">{env.name}</p>
                      <p className="text-xs text-white/40">{env.sub}</p>
                    </div>
                    {selectedEnv === env.id && <span className="ml-auto text-amber-400 text-xl">✓</span>}
                  </div>
                  <div className="flex gap-1.5 mt-3 relative flex-wrap">
                    {env.hasSea && <span className="text-[9px] px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/20">🌊 بحر وأمواج</span>}
                    {env.hasFarm && <span className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">🌱 مزارع</span>}
                    {env.hasSand && !env.hasPetra && <span className="text-[9px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/20">🏖️ شواطئ</span>}
                    {env.hasPetra && <span className="text-[9px] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-400/20">🏛️ آثار</span>}
                    {!env.hasSea && !env.hasFarm && !env.hasSand && <span className="text-[9px] px-2 py-1 rounded-full bg-slate-500/15 text-slate-300 border border-slate-400/20">🏙️ حضري</span>}
                    <span className={`text-[9px] px-2 py-1 rounded-full border ${env.roundaboutFreq === 1 ? "bg-rose-500/15 text-rose-300 border-rose-400/20" : env.roundaboutFreq === 2 ? "bg-purple-500/15 text-purple-300 border-purple-400/20" : "bg-blue-500/15 text-blue-300 border-blue-400/20"}`}>
                      🔄 دوارات {env.roundaboutFreq === 1 ? "كثيرة" : env.roundaboutFreq === 2 ? "متوسطة" : "قليلة"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => goBackTo("selectCar")} className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative">التالي: اختيار السيارة</span><span className="relative text-xl">←</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ CAR SELECTION ═══ */}
      {phase === "selectCar" && (
        <div className="absolute inset-0 bg-[#0c0f1a]/92 backdrop-blur-2xl flex items-center justify-center z-30 overflow-y-auto py-10">
          <div className="text-center px-6 max-w-3xl w-full">
            <p className="text-[10px] text-amber-300/60 uppercase tracking-[0.25em] font-bold mb-2">الخطوة 2 من 2</p>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">اختر سيارتك</h2>
            <p className="text-sm text-slate-400 mb-8">كل سيارة لها خصائص تسارع وسيطرة مختلفة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {CARS.map(car => (
                <button key={car.id} onClick={() => setSelectedCar(car.id)}
                  className={`relative rounded-3xl p-5 border-2 text-right transition-all ${selectedCar === car.id ? "border-amber-400/60 bg-amber-500/10 shadow-xl shadow-amber-500/10 scale-[1.02]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: car.color + "22", border: `2px solid ${car.color}55` }}>{car.icon}</div>
                    <div><p className="text-lg font-black text-white">{car.name}</p><p className="text-xs text-white/40">{car.sub}</p></div>
                    {selectedCar === car.id && <span className="ml-auto text-amber-400 text-xl">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2"><p className="text-white/30 mb-1">التسارع</p><div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${car.accelMul * 70}%` }} /></div></div>
                    <div className="bg-white/[0.04] rounded-xl px-3 py-2"><p className="text-white/30 mb-1">السيطرة</p><div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${car.handlingMul * 70}%` }} /></div></div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={startGame} className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative text-2xl">▶</span><span className="relative">ابدأ الفحص</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ FINISHED SCREEN ═══ */}
      {phase === "finished" && (
        <div className="absolute inset-0 bg-[#0c0f1a]/92 backdrop-blur-2xl flex items-center justify-center z-30 overflow-y-auto py-8">
          <div className={`text-center px-6 max-w-lg w-full transition-all duration-700 ${scoreRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="relative mx-auto mb-4 w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={passed ? "#22c55e" : "#ef4444"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.min(totalSc / maxSc * 100, 100) * 3.27} 327`} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className={`text-5xl font-black font-mono tabular-nums ${passed ? "text-emerald-300" : "text-red-300"}`}>{totalSc}</p>
                <p className="text-xs text-white/25">/ {maxSc}</p>
              </div>
            </div>
            <div className={`text-3xl font-black mb-5 ${passed ? "text-emerald-300" : "text-red-300"}`}>{passed ? "🏆 ناجح — مبارك!" : "❌ راسب — حاول مجددًا"}</div>
            <div className="grid grid-cols-4 gap-2 mb-5">{secData.map(s => { const p = s.max > 0 ? s.scored / s.max * 100 : 0; return (<div key={s.sec} className={`rounded-2xl p-2.5 text-center border transition-all ${p >= 75 ? "bg-emerald-500/10 border-emerald-500/15" : p >= 50 ? "bg-amber-500/10 border-amber-500/15" : "bg-red-500/10 border-red-500/15"}`}><p className="text-[8px] text-white/50 leading-tight mb-0.5">{s.name}</p><p className="font-bold text-white text-sm tabular-nums">{s.scored}<span className="text-white/25 text-[9px]">/{s.max}</span></p></div>); })}</div>
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden mb-4"><div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg,#dc2626 0%,#f59e0b 50%,#22c55e 75%,#059669 100%)" }} /><div className="absolute top-0 h-full w-[2px] bg-white/50" style={{ left: "75%" }} /><div className="absolute top-[-2px] h-[calc(100%+4px)] w-2.5 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-1000" style={{ left: `${Math.min(totalSc / maxSc * 100, 100)}%`, transform: "translateX(-50%)" }} /></div>
            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-4 mb-5 max-h-40 overflow-y-auto text-left" style={{ scrollbarWidth: "thin" }}>
              <div className="space-y-1">{SCORES.map(si => { const v = sc[si.key], f = v === 0; return (<div key={si.key} className={`flex items-center justify-between text-[9px] px-2 py-1 rounded-lg ${f ? "bg-red-500/[0.06]" : "bg-transparent"}`}><span className={f ? "text-red-400/70 line-through" : "text-white/30"} dir="rtl">{f ? "✗" : "✓"} {si.label}</span><span className={`tabular-nums font-bold ${f ? "text-red-400/70" : "text-white/15"}`}>{v}/{si.max}</span></div>); })}</div>
            </div>
            <p className="text-[11px] text-white/20 mb-5">المسافة: {dist.toLocaleString()} م · اصطفاف: {parkAlign}% · {envRef.current.name} · {carRef.current.name}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={startGame} className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative text-2xl">🔄</span><span className="relative">العب مجددًا</span>
              </button>
              <button onClick={goBackToIdle} className="px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/70 font-bold text-lg inline-flex items-center gap-3 transition-all active:scale-95">
                <span className="text-xl">→</span><span>القائمة الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}