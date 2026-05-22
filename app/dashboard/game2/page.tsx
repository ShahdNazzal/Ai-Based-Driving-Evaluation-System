"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   Sound Engine — مؤثرات صوتية بالـ Web Audio API
   ═══════════════════════════════════════════════════════════════ */
class SoundEngine {
  ctx: AudioContext | null = null;
  engOsc: OscillatorNode | null = null;
  engGain: GainNode | null = null;
  lastColl = 0;
  _muted = false;
  
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
    } catch (e) { /* audio unavailable */ }
  }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
  setMuted(m: boolean) { this._muted = m; if (m) this.stopEngine(); }
  get muted() { return this._muted; }
  updateEngine(spd: number) {
    if (!this.engOsc || !this.engGain || !this.ctx || this._muted) return;
    this.engOsc.frequency.value = 75 + spd * 12;
    this.engGain.gain.value = Math.min(spd * 0.022, 0.1);
  }
  stopEngine() { if (this.engGain) this.engGain.gain.value = 0; }
  
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
    try { if(this.engOsc) this.engOsc.stop(); } catch (e) {} 
    try { if(this.ctx) this.ctx.close(); } catch (e) {} 
    this.ctx = null; this.engOsc = null; this.engGain = null; 
  }
}

/* ═══════════════════════════════════════════════════════════════
   الأنواع
   ═══════════════════════════════════════════════════════════════ */
type ScoreKey =
  |"seat_adjust"|"mirror_adjust"|"seatbelt"|"start_observe"|"driver_behavior"
  |"gear_use"|"road_conditions"|"steering_control"|"positioning"
  |"indicator_use"|"lane_keeping"|"turn_selection"|"sign_compliance"
  |"traffic_attention"|"ground_marks"|"intersections"|"indicator_procedure"
  |"overtake_timing"|"overtake_signal"|"overtake_monitor"|"overtake_return"
  |"normal_stop"|"sudden_stop"|"intersection_gap"|"stop_signs"
  |"pedestrians"|"vehicles"|"road_env"|"obstacles"
  |"parking_safe"|"reverse_look"|"reverse_monitor"|"parking_align";
type GamePhase = "idle"|"playing"|"parking"|"finished";

interface ScoreItem{key:ScoreKey;label:string;max:number;section:number;}
interface CrossCar{id:number;x:number;y:number;w:number;h:number;speed:number;color:string;}
interface Intersection{id:number;y:number;width:number;lightState:"red"|"green"|"yellow";lightTimer:number;cycleDuration:number;crossTraffic:CrossCar[];scored:boolean;violated:boolean;approached:boolean;lastSpawn:number;}
interface Bldg{y:number;side:"L"|"R";label:string;sub:string;w:number;h:number;color:string;awc:string;hasAw:boolean;type:string;}
interface Obs{id:number;kind:string;x:number;y:number;w:number;h:number;vy:number;vx:number;active:boolean;hit:boolean;scored:boolean;data?:any;}
interface TreeO{x:number;y:number;scale:number;type:"palm"|"olive"|"cypress";}
interface Ptc{x:number;y:number;vx:number;vy:number;life:number;ml:number;color:string;size:number;}
interface RMark{y:number;type:string;}
interface GovS{x:number;y:number;dest:string;km:number;side:string;}
interface PZone{x:number;y:number;w:number;h:number;timer:number;confirmed:boolean;alignQ:number;}

interface GS{
  px:number;py:number;pw:number;ph:number;
  speed:number;targetLane:number;currentLane:number;
  lcT:number;lcIng:boolean;
  lb:boolean;rb:boolean;bt:number;
  roadOff:number;bgOff:number;dist:number;
  inters:Intersection[];obs:Obs[];trees:TreeO[];
  lights:{x:number;y:number}[];bldgs:Bldg[];rms:RMark[];
  ptcs:Ptc[];govs:GovS[];
  niDist:number;noDist:number;nbDist:number;ntDist:number;
  offRT:number;ttT:number;
  pens:Set<ScoreKey>;sigUsed:boolean;sigT:number;
  flashMsg:string;flashT:number;flashType:"pen"|"rew"|"warn"|"info";
  parking:PZone;
  hornT:number;
}

/* ═══════════════════════════════════════════════════════════════
   الثوابت
   ═══════════════════════════════════════════════════════════════ */
const SCORES:ScoreItem[]=[
  {key:"seat_adjust",label:"تعديل الكرسي",max:2,section:1},{key:"mirror_adjust",label:"تعديل المرايا",max:2,section:1},
  {key:"seatbelt",label:"حزام الأمان",max:2,section:1},{key:"start_observe",label:"المراقبة وبدء الحركة",max:2,section:1},
  {key:"driver_behavior",label:"سلوك السائق",max:2,section:1},
  {key:"gear_use",label:"استخدام الغيار",max:4,section:2},{key:"road_conditions",label:"الظروف المحيطة",max:3,section:2},
  {key:"steering_control",label:"السيطرة على المقود",max:4,section:2},{key:"positioning",label:"التموضع",max:4,section:2},
  {key:"indicator_use",label:"استخدام الغماز",max:3,section:3},{key:"lane_keeping",label:"الحفاظ على المسرب",max:4,section:3},
  {key:"turn_selection",label:"اختيار مكان الدوران",max:4,section:3},{key:"sign_compliance",label:"مراعاة الشواخص",max:4,section:3},
  {key:"traffic_attention",label:"الانتباه لحركة المرور",max:4,section:4},{key:"ground_marks",label:"العلامات الأرضية",max:4,section:4},
  {key:"intersections",label:"التعامل مع المقاطعات",max:4,section:4},{key:"indicator_procedure",label:"الغماز عند كل إجراء",max:3,section:4},
  {key:"overtake_timing",label:"اختيار وقت التجاوز",max:3,section:5},{key:"overtake_signal",label:"غماز التجاوز",max:2,section:5},
  {key:"overtake_monitor",label:"المراقبة أثناء التجاوز",max:3,section:5},{key:"overtake_return",label:"العودة للمسرب بأمان",max:2,section:5},
  {key:"normal_stop",label:"الوقوف العادي",max:2,section:6},{key:"sudden_stop",label:"الوقوف المفاجئ",max:3,section:6},
  {key:"intersection_gap",label:"مسافة الأمان بالتقاطع",max:3,section:6},{key:"stop_signs",label:"شواخص الوقوف",max:2,section:6},
  {key:"pedestrians",label:"التعامل مع المشاة",max:4,section:7},{key:"vehicles",label:"التعامل مع المركبات",max:4,section:7},
  {key:"road_env",label:"بيئة الطريق",max:4,section:7},{key:"obstacles",label:"التعامل مع العوائق",max:3,section:7},
  {key:"parking_safe",label:"الوقوف الآمن للرجوع",max:2,section:8},{key:"reverse_look",label:"النظر قبل الرجوع",max:2,section:8},
  {key:"reverse_monitor",label:"المراقبة أثناء الرجوع",max:3,section:8},{key:"parking_align",label:"الاصطفاف",max:3,section:8},
];
const SEC_NAMES=["","الاستعداد","السيطرة","الدوران","قواعد المرور","التجاوز","الوقوف والأمان","عناصر المرور","الاصطفاف"];
const TARGET_DIST=15000;
const CAR_COLS=["#1E40AF","#B91C1C","#15803D","#C2410C","#6D28D9","#0369A1","#475569","#1C1917","#F5F5F4","#CA8A04"];
const BLDS=[
  {type:"shop",label:"دكّانة أبو محمود",sub:"بقالة وتموين",color:"#C4A882",awc:"#2E7D32",hasAw:true},
  {type:"bakery",label:"مخبز الصفا",sub:"خبز عربي طازج",color:"#D4C0A0",awc:"#D84315",hasAw:true},
  {type:"pharmacy",label:"صيدلية الشفاء",sub:"24 ساعة",color:"#E8E0D0",awc:"#4CAF50",hasAw:true},
  {type:"school",label:"مدرسة الصريح",sub:"الأساسية المختلطة",color:"#B8C4D0",awc:"#5C6BC0",hasAw:true},
  {type:"gov",label:"دائرة السير",sub:"وزارة الداخلية",color:"#9E9E8E",awc:"#37474F",hasAw:false},
  {type:"university",label:"جامعة اليرموك",sub:"إربد",color:"#C8B8A0",awc:"#1565C0",hasAw:false},
  {type:"restaurant",label:"مطعم المنسف",sub:"منسف أردني أصيل",color:"#D0B898",awc:"#BF360C",hasAw:true},
  {type:"cafe",label:"قهوة أبو الليف",sub:"شاي وقهوة",color:"#C8B090",awc:"#795548",hasAw:true},
  {type:"mosque",label:"مسجد الحسن",sub:"",color:"#D8D0C0",awc:"#0097A7",hasAw:false},
  {type:"bank",label:"بنك الأردن",sub:"فرع العاصمة",color:"#E0E0D0",awc:"#1565C0",hasAw:true},
  {type:"shop",label:"سوبرماركت الحسيني",sub:"كل ما تحتاجه",color:"#D0C0A0",awc:"#F57F17",hasAw:true},
  {type:"house",label:"",sub:"",color:"#C8BCA8",awc:"",hasAw:false},{type:"house",label:"",sub:"",color:"#D0C4B0",awc:"",hasAw:false},
  {type:"shop",label:"مكتبة الأمل",sub:"قرطاسية وكتب",color:"#D8D0C0",awc:"#6A1B9A",hasAw:true},
  {type:"restaurant",label:"فالافل الحاج",sub:"فلافل ساخنة",color:"#D8C8A8",awc:"#E65100",hasAw:true},
  {type:"shop",label:"حلاق أبو سامي",sub:"قصّ شعر",color:"#C0B8A8",awc:"#455A64",hasAw:true},
  {type:"pharmacy",label:"صيدلية النور",sub:"",color:"#E8E4D8",awc:"#388E3C",hasAw:true},
  {type:"shop",label:"محل العطور",sub:"عطور شرقية",color:"#D4C8B8",awc:"#880E4F",hasAw:true},
];

/* ═══════════════════════════════════════════════════════════════
   دوال الرسم
   ═══════════════════════════════════════════════════════════════ */
function drawPalm(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  c.fillStyle="#7A5C14";c.beginPath();c.moveTo(x-3*s,y);c.lineTo(x+3*s,y);c.lineTo(x+2*s,y-50*s);c.lineTo(x-2*s,y-50*s);c.closePath();c.fill();
  [[-26,-6,-3,-56,5,0],[26,-6,3,-56,-5,0],[-16,-3,-1,-62,10,2],[16,-3,1,-62,-10,2],[0,-22,0,-68,0,7],[-30,-24,-7,-62,3,0],[30,-24,7,-62,-3,0]].forEach(([a,b,d,e,f,g])=>{
    c.fillStyle="#2d7a2d";c.beginPath();c.moveTo(x+a*s,y+b*s);c.bezierCurveTo(x+(a*.5+d*.5)*s,y+(b*.5+e*.5)*s,x+d*s,y+e*s,x+d*s,y+e*s);c.bezierCurveTo(x+(d*.5+f*.5)*s,y+(e*.5+g*.5)*s,x+f*s,y+g*s,x+a*s,y+b*s);c.fill();
  });
}
function drawOlive(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  c.fillStyle="#6B5030";c.fillRect(x-2*s,y-15*s,4*s,15*s);c.fillStyle="#4A7A3A";c.beginPath();c.arc(x,y-20*s,14*s,0,Math.PI*2);c.fill();
  c.fillStyle="#3A6A2A";c.beginPath();c.arc(x-6*s,y-24*s,10*s,0,Math.PI*2);c.fill();c.beginPath();c.arc(x+7*s,y-22*s,9*s,0,Math.PI*2);c.fill();
  c.fillStyle="#5A8A4A";c.beginPath();c.arc(x+2*s,y-28*s,8*s,0,Math.PI*2);c.fill();
}
function drawCypress(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  c.fillStyle="#5A4A30";c.fillRect(x-2*s,y-10*s,4*s,10*s);c.fillStyle="#2A5A2A";c.beginPath();c.moveTo(x,y-55*s);c.lineTo(x+8*s,y-10*s);c.lineTo(x-8*s,y-10*s);c.closePath();c.fill();
  c.fillStyle="#1A4A1A";c.beginPath();c.moveTo(x,y-55*s);c.lineTo(x+5*s,y-30*s);c.lineTo(x-5*s,y-30*s);c.closePath();c.fill();
}
function drawSL(c:CanvasRenderingContext2D,x:number,y:number){
  c.strokeStyle="#6b7060";c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-55);c.stroke();
  c.beginPath();c.moveTo(x,y-52);c.lineTo(x+18,y-55);c.stroke();c.fillStyle="#4a4a40";c.fillRect(x+13,y-61,20,9);
  const g=c.createRadialGradient(x+23,y-56,0,x+23,y-54,20);g.addColorStop(0,"rgba(255,220,80,0.6)");g.addColorStop(1,"rgba(255,220,80,0)");c.fillStyle=g;c.beginPath();c.ellipse(x+23,y-54,20,12,0,0,Math.PI*2);c.fill();
}
function drawBldg(c:CanvasRenderingContext2D,b:Bldg,re:number){
  const bx=b.side==="L"?re-b.w-4:re+4;
  c.fillStyle="rgba(0,0,0,0.08)";c.fillRect(bx+3,b.y+3,b.w,b.h);c.fillStyle=b.color;c.fillRect(bx,b.y,b.w,b.h);c.strokeStyle="rgba(0,0,0,0.15)";c.lineWidth=1;c.strokeRect(bx,b.y,b.w,b.h);
  c.fillStyle="rgba(0,0,0,0.04)";c.fillRect(bx,b.y,b.w,4);
  if(b.hasAw){c.fillStyle=b.awc;c.beginPath();c.moveTo(bx-4,b.y);c.lineTo(bx+b.w+4,b.y);c.lineTo(bx+b.w+7,b.y-9);c.lineTo(bx-7,b.y-9);c.closePath();c.fill();}
  const cols=Math.floor((b.w-8)/12),rows=Math.floor((b.h-20)/14);
  for(let r=0;r<rows;r++)for(let cc=0;cc<cols;cc++){c.fillStyle="rgba(180,215,255,0.55)";c.fillRect(bx+6+cc*12,b.y+8+r*14,7,9);c.strokeStyle="rgba(0,0,0,0.1)";c.strokeRect(bx+6+cc*12,b.y+8+r*14,7,9);}
  c.fillStyle="#5D4037";c.fillRect(bx+b.w/2-5,b.y+b.h-16,10,16);
  if(b.type==="mosque"){c.fillStyle="#D0D0D0";c.beginPath();c.arc(bx+b.w/2,b.y-4,10,Math.PI,0);c.fill();c.fillStyle="#C0C0C0";c.fillRect(bx+b.w/2-2,b.y-18,4,14);}
  if(b.type==="gov"||b.type==="university"){drawJFlag(c,bx+b.w-16,b.y-(b.hasAw?12:2),14,9);}
  if(b.label){c.save();c.fillStyle="#222";c.font="bold 8px sans-serif";c.textAlign="center";const ty=b.y-(b.hasAw?12:3);c.fillText(b.label,bx+b.w/2,ty,b.w+10);if(b.sub){c.font="6.5px sans-serif";c.fillStyle="#666";c.fillText(b.sub,bx+b.w/2,ty-9,b.w+10);}c.restore();}
}
function drawJFlag(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  c.fillStyle="#000";c.fillRect(x,y,w,h/3);c.fillStyle="#fff";c.fillRect(x,y+h/3,w,h/3);c.fillStyle="#007A3D";c.fillRect(x,y+2*h/3,w,h/3);
  c.fillStyle="#CE1126";c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.45,y+h/2);c.lineTo(x,y+h);c.closePath();c.fill();
}
function drawPlayerCar(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,spd:number,lb:boolean,rb:boolean,bt:number){
  const bon=spd===0;const bOn=Math.floor(bt/15)%2===0;
  c.fillStyle="rgba(0,0,0,0.25)";c.beginPath();c.ellipse(x+w/2,y+h+5,w*.6,6,0,0,Math.PI*2);c.fill();
  const g=c.createLinearGradient(x,y,x,y+h);
  if(bon){g.addColorStop(0,"#fbbf24");g.addColorStop(1,"#b45309");}else{g.addColorStop(0,"#fff");g.addColorStop(.4,"#e8e8e8");g.addColorStop(1,"#b0adaa");}
  c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,[10,10,6,6]);c.fill();
  c.fillStyle=bon?"#d97706bb":"#d0cdc888";c.beginPath();c.roundRect(x+4,y+8,w-8,h*.38,[7,7,2,2]);c.fill();
  c.fillStyle="rgba(180,220,255,0.78)";c.beginPath();c.roundRect(x+6,y+10,w-12,h*.22,4);c.fill();
  c.fillStyle="rgba(255,255,255,0.3)";c.beginPath();c.moveTo(x+8,y+11);c.lineTo(x+16,y+11);c.lineTo(x+14,y+h*.26);c.lineTo(x+8,y+h*.26);c.fill();
  c.fillStyle="#fef9c3";c.fillRect(x+3,y+3,8,5);c.fillRect(x+w-11,y+3,8,5);
  if(lb&&bOn){c.fillStyle="#f59e0b";c.fillRect(x+2,y+8,5,5);}if(rb&&bOn){c.fillStyle="#f59e0b";c.fillRect(x+w-7,y+8,5,5);}
  c.fillStyle="#ef4444";c.fillRect(x+3,y+h-7,8,4);c.fillRect(x+w-11,y+h-7,8,4);
  c.fillStyle="#fff";c.fillRect(x+w*.22,y+h-11,w*.56,9);c.strokeStyle="#999";c.lineWidth=.5;c.strokeRect(x+w*.22,y+h-11,w*.56,9);
  c.fillStyle="#1d4ed8";c.font=`bold ${Math.floor(w*.12)}px monospace`;c.textAlign="center";c.fillText("JO",x+w/2,y+h-4);
  c.fillStyle="#222";c.font=`bold ${Math.floor(w*.2)}px monospace`;c.fillText(`${Math.floor(spd*20)}`,x+w/2,y+h*.72);
}
function drawHCar(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,col:string){
  c.fillStyle="rgba(0,0,0,0.18)";c.beginPath();c.ellipse(x+w/2,y+h+3,w*.5,4,0,0,Math.PI*2);c.fill();
  c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,[6,6,4,4]);c.fill();c.fillStyle=col+"aa";c.beginPath();c.roundRect(x+w*.2,y+3,w*.6,h*.3,[4,4,1,1]);c.fill();
  c.fillStyle="rgba(180,220,255,0.6)";c.beginPath();c.roundRect(x+w*.25,y+4,w*.5,h*.18,3);c.fill();
  c.fillStyle="#fef9c3";c.fillRect(x+w-4,y+2,4,4);c.fillRect(x+w-4,y+h-6,4,4);c.fillStyle="#ef4444";c.fillRect(x,y+2,4,4);c.fillRect(x,y+h-6,4,4);
  c.fillStyle="#fff";c.fillRect(x+w*.35,y+h-7,w*.3,6);c.strokeStyle="#999";c.lineWidth=.4;c.strokeRect(x+w*.35,y+h-7,w*.3,6);
}
function drawTLBox(c:CanvasRenderingContext2D,x:number,y:number,st:string){
  c.strokeStyle="#777";c.lineWidth=2;c.beginPath();c.moveTo(x,y+55);c.lineTo(x,y+90);c.stroke();
  c.fillStyle="#1a1a1a";c.beginPath();c.roundRect(x-9,y,18,52,4);c.fill();
  const lights:[string,string,number][]=[["#ef4444","red",8],["#f59e0b","yellow",28],["#22c55e","green",46]];
  lights.forEach(([col,s,ly])=>{
    const on=s===st;c.fillStyle=on?col:"#333";c.beginPath();c.arc(x,y+ly,6,0,Math.PI*2);c.fill();
    if(on){const gr=c.createRadialGradient(x,y+ly,0,x,y+ly,12);gr.addColorStop(0,col+"88");gr.addColorStop(1,col+"00");c.fillStyle=gr;c.beginPath();c.arc(x,y+ly,12,0,Math.PI*2);c.fill();}
  });
}
function drawPothole(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){c.fillStyle="#0f0c0a";c.beginPath();c.ellipse(x+w/2,y+h/2+2,w/2,h/2,0,0,Math.PI*2);c.fill();c.fillStyle="#1c1814";c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);c.fill();c.strokeStyle="#3d3428";c.lineWidth=1.5;c.stroke();}
function drawSpeedbump(c:CanvasRenderingContext2D,x:number,y:number,w:number){c.fillStyle="#f59e0b";c.beginPath();c.roundRect(x,y,w,12,3);c.fill();c.fillStyle="#000";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText("مطب",x+w/2,y+9);}
function drawPedestrian(c:CanvasRenderingContext2D,x:number,y:number,dir:number,hit:boolean){
  const cl=hit?"#ef4444":"#4b5563";c.strokeStyle=cl;c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fillStyle=cl;c.fill();
  c.beginPath();c.moveTo(x,y+6);c.lineTo(x,y+18);c.stroke();c.beginPath();c.moveTo(x-7,y+11);c.lineTo(x+7,y+11);c.stroke();
  c.beginPath();c.moveTo(x,y+18);c.lineTo(x-5,y+28);c.moveTo(x,y+18);c.lineTo(x+5,y+28);c.stroke();
}
function drawCat(c:CanvasRenderingContext2D,x:number,y:number,dir:number){
  c.fillStyle="#F5A623";c.beginPath();c.ellipse(x,y,6,4,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(x+dir*5,y-3,3.5,0,Math.PI*2);c.fill();
  c.fillStyle="#333";c.beginPath();c.arc(x+dir*6,y-4,1,0,Math.PI*2);c.fill();c.strokeStyle="#F5A623";c.lineWidth=1;
  c.beginPath();c.moveTo(x-dir*2,y-5);c.lineTo(x-dir*2,y-9);c.moveTo(x+dir*1,y-5);c.lineTo(x+dir*1,y-9);c.stroke();
  c.beginPath();c.moveTo(x-dir*5,y+2);c.quadraticCurveTo(x-dir*8,y+8,x-dir*4,y+6);c.stroke();
}
function drawCone(c:CanvasRenderingContext2D,x:number,y:number){c.fillStyle="#f97316";c.beginPath();c.moveTo(x,y-22);c.lineTo(x+8,y);c.lineTo(x-8,y);c.closePath();c.fill();c.fillStyle="rgba(255,255,255,0.35)";c.beginPath();c.moveTo(x,y-22);c.lineTo(x+8,y-11);c.lineTo(x-8,y-11);c.closePath();c.fill();c.fillStyle="#888";c.fillRect(x-10,y,20,3);}
function drawSpeedSign(c:CanvasRenderingContext2D,x:number,y:number,lim:number){
  c.strokeStyle="#888";c.lineWidth=2;c.beginPath();c.moveTo(x,y+18);c.lineTo(x,y+40);c.stroke();
  c.fillStyle="#fff";c.beginPath();c.arc(x,y,16,0,Math.PI*2);c.fill();c.strokeStyle="#dc2626";c.lineWidth=2.5;c.stroke();
  c.fillStyle="#111";c.font="bold 11px sans-serif";c.textAlign="center";c.fillText(`${lim}`,x,y+4);
}
function drawStopSignBox(c:CanvasRenderingContext2D,x:number,y:number){
  c.strokeStyle="#888";c.lineWidth=2;c.beginPath();c.moveTo(x,y+16);c.lineTo(x,y+40);c.stroke();
  c.fillStyle="#dc2626";c.beginPath();for(let i=0;i<8;i++){const a=(Math.PI/4)*i-Math.PI/8;if(i===0)c.moveTo(x+14*Math.cos(a),y+14*Math.sin(a));else c.lineTo(x+14*Math.cos(a),y+14*Math.sin(a));}c.closePath();c.fill();
  c.fillStyle="#fff";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText("STOP",x,y+2);c.font="bold 6px sans-serif";c.fillText("قف",x,y+10);
}
function drawGovSignBox(c:CanvasRenderingContext2D,x:number,y:number,dest:string,km:number,side:string){
  const bw=80,bh=32,bx=side==="L"?x+5:x-bw-5;
  c.strokeStyle="#888";c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+45);c.stroke();
  c.fillStyle="#1a6b3a";c.beginPath();c.roundRect(bx,y-bh,bw,bh,3);c.fill();c.strokeStyle="#fff";c.lineWidth=1;c.beginPath();c.roundRect(bx+1,y-bh+1,bw-2,bh-2,2);c.stroke();
  c.fillStyle="#fff";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(side==="L"?"←":"→",bx+(side==="L"?10:bw-10),y-bh/2+3);
  c.font="bold 8px sans-serif";c.fillText(dest,bx+bw/2,y-bh*.6+1);c.font="7px sans-serif";c.fillText(`${km} كم`,bx+bw/2,y-bh*.25+1);
}
function drawSlowCar(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,col:string){
  c.fillStyle="rgba(0,0,0,0.2)";c.beginPath();c.ellipse(x+w/2,y+h+4,w*.5,5,0,0,Math.PI*2);c.fill();
  const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,col);g.addColorStop(.6,col+"cc");g.addColorStop(1,col+"88");
  c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,[8,8,5,5]);c.fill();c.fillStyle=col+"aa";c.beginPath();c.roundRect(x+3,y+6,w-6,h*.35,[6,6,1,1]);c.fill();
  c.fillStyle="rgba(180,220,255,0.65)";c.beginPath();c.roundRect(x+5,y+8,w-10,h*.2,3);c.fill();
  c.fillStyle="#fef9c3";c.fillRect(x+2,y+2,7,4);c.fillRect(x+w-9,y+2,7,4);c.fillStyle="#ef4444";c.fillRect(x+2,y+h-6,7,3);c.fillRect(x+w-9,y+h-6,7,3);
  c.fillStyle="#fff";c.fillRect(x+w*.2,y+h-10,w*.6,8);c.fillStyle="#1d4ed8";c.font=`bold ${Math.floor(w*.11)}px monospace`;c.textAlign="center";c.fillText("JO",x+w/2,y+h-4);
}

function drawParkingZone(c:CanvasRenderingContext2D,z:PZone,carX:number,carY:number,carW:number,carH:number){
  const {x,y,w,h}=z;
  c.fillStyle="rgba(37,99,235,0.08)";c.fillRect(x-4,y-4,w+8,h+8);
  c.strokeStyle="#fff";c.lineWidth=3;c.setLineDash([]);
  c.beginPath();c.moveTo(x,y);c.lineTo(x,y+h);c.stroke();
  c.beginPath();c.moveTo(x+w,y);c.lineTo(x+w,y+h);c.stroke();
  c.beginPath();c.moveTo(x,y+h);c.lineTo(x+w,y+h);c.stroke();
  c.fillStyle="#2563EB";c.beginPath();c.roundRect(x+w/2-14,y-34,28,28,8);c.fill();
  c.strokeStyle="#93c5fd";c.lineWidth=1.5;c.beginPath();c.roundRect(x+w/2-14,y-34,28,28,8);c.stroke();
  c.fillStyle="#fff";c.font="bold 16px sans-serif";c.textAlign="center";c.fillText("P",x+w/2,y-14);
  const tx=x+w/2-carW/2,ty=y+h/2-carH/2;
  c.strokeStyle="rgba(34,197,94,0.4)";c.lineWidth=1.5;c.setLineDash([6,4]);
  c.strokeRect(tx,ty,carW,carH);c.setLineDash([]);
  const cx=carX+carW/2,zx=x+w/2,hOff=Math.abs(cx-zx),hQ=Math.max(0,1-hOff/(w/2+carW/2));
  const vTop=Math.max(carY,y),vBot=Math.min(carY+carH,y+h),vOvl=Math.max(0,vBot-vTop),vQ=Math.min(1,vOvl/carH);
  const total=hQ*.6+vQ*.4;
  const barX=x+w+14,barW=10,barH=h,barY=y;
  c.fillStyle="rgba(0,0,0,0.5)";c.beginPath();c.roundRect(barX-1,barY-1,barW+2,barH+2,5);c.fill();
  const fillH=barH*total;const col=total>.8?"#22c55e":total>.5?"#f59e0b":"#ef4444";
  c.fillStyle=col;c.beginPath();c.roundRect(barX,barY+barH-fillH,barW,fillH,4);c.fill();
  c.fillStyle=col;c.font="bold 11px sans-serif";c.textAlign="center";
  c.fillText(`${Math.round(total*100)}%`,barX+barW/2,barY-8);
  const gl=c.createRadialGradient(x+w/2,y+h/2,10,x+w/2,y+h/2,w);
  gl.addColorStop(0,col+"15");gl.addColorStop(1,col+"00");c.fillStyle=gl;c.beginPath();c.ellipse(x+w/2,y+h/2,w*1.2,h*.8,0,0,Math.PI*2);c.fill();
  return total;
}

/* ═══════════════════════════════════════════════════════════════
   المكوّن الرئيسي
   ═══════════════════════════════════════════════════════════════ */
export default function JordanDrivingSim(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const rafRef=useRef(0);
  const keysRef=useRef(new Set<string>());
  const gsRef=useRef<GS>(mkGS());
  const scRef=useRef<Record<ScoreKey,number>>(mkSc());
  const phRef=useRef<GamePhase>("idle");
  const sndRef=useRef<SoundEngine|null>(null);
  const parkTimerRef=useRef(0);
  const parkAlignRef=useRef(0);

  const[phase,setPhase]=useState<GamePhase>("idle");
  const[sc,setSc]=useState<Record<ScoreKey,number>>(mkSc());
  const[dist,setDist]=useState(0);
  const[fMsg,setFMsg]=useState("");
  const[fType,setFType]=useState<"pen"|"rew"|"warn"|"info">("info");
  const[showPanel,setShowPanel]=useState(true);
  const[muted,setMuted]=useState(false);
  const[parkTimer,setParkTimer]=useState(45);
  const[parkAlign,setParkAlign]=useState(0);
  const[scoreRevealed,setScoreRevealed]=useState(false);

  function mkGS():GS{return{px:0,py:0,pw:36,ph:64,speed:0,targetLane:1,currentLane:1,lcT:0,lcIng:false,lb:false,rb:false,bt:0,roadOff:0,bgOff:0,dist:0,inters:[],obs:[],trees:[],lights:[],bldgs:[],rms:[],ptcs:[],govs:[],niDist:1800,noDist:600,nbDist:300,ntDist:200,offRT:0,ttT:0,pens:new Set(),sigUsed:false,sigT:0,flashMsg:"",flashT:0,flashType:"info",parking:{x:0,y:0,w:44,h:85,timer:0,confirmed:false,alignQ:0},hornT:0};}
  function mkSc(){const s={}as Record<ScoreKey,number>;SCORES.forEach(i=>{s[i.key]=i.max;});return s;}

  const flash=useCallback((msg:string,type:"pen"|"rew"|"warn"|"info")=>{
    const g=gsRef.current;g.flashMsg=msg;g.flashT=110;g.flashType=type;setFMsg(msg);setFType(type);
  },[]);

  const pen=useCallback((k:ScoreKey,msg?:string)=>{
    const g=gsRef.current;if(g.pens.has(k))return;g.pens.add(k);
    const n={...scRef.current,[k]:0};scRef.current=n;setSc({...n});
    if(msg)flash("✗ "+msg,"pen");
    if(["pedestrians","vehicles","obstacles","road_env","road_conditions","steering_control","intersection_gap"].includes(k))sndRef.current?.playCollision();
  },[flash]);

  const rew=useCallback((k:ScoreKey,msg?:string)=>{if(msg)flash("✓ "+msg,"rew");},[flash]);

  const startParking=useCallback(()=>{
    phRef.current="parking";setPhase("parking");
    const g=gsRef.current;g.speed=0;sndRef.current?.stopEngine();
    const r=canvasRef.current?.getBoundingClientRect();if(!r)return;
    const cw=r.width,ch=r.height,rr=cw*.65,rw=rr-cw*.35,lw=rw/3;
    const lane2X=cw*.35+2*lw+lw/2-18;
    g.parking={x:lane2X-4,y:ch/2-42,w:44,h:85,timer:45*60,confirmed:false,alignQ:0};
    parkTimerRef.current=45*60;parkAlignRef.current=0;setParkTimer(45);setParkAlign(0);
  },[]);

  const confirmParking=useCallback(()=>{
    const g=gsRef.current;g.parking.confirmed=true;
    const q=parkAlignRef.current;g.parking.alignQ=q;
    const ns={...scRef.current};
    if(q<0.35){ns.parking_align=0;ns.parking_safe=0;ns.reverse_monitor=0;}
    else if(q<0.6){ns.parking_align=1;ns.reverse_monitor=1;}
    else if(q<0.85){ns.parking_align=2;ns.reverse_monitor=2;}
    else{ns.parking_align=3;ns.reverse_monitor=3;ns.parking_safe=2;}
    if(q>=0.5)ns.reverse_look=2;
    scRef.current=ns;setSc({...ns});sndRef.current?.playParkChime();
    setTimeout(()=>{
      phRef.current="finished";setPhase("finished");setScoreRevealed(false);
      setTimeout(()=>setScoreRevealed(true),300);
      const total=SCORES.reduce((s,i)=>s+ns[i.key],0);
      if(total>=75)sndRef.current?.playSuccess();else sndRef.current?.playFail();
    },800);
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const ctx=cv.getContext("2d");if(!ctx)return;
    const snd=new SoundEngine();sndRef.current=snd;

    const resize=()=>{
      const r=cv.getBoundingClientRect();cv.width=r.width*2;cv.height=r.height*2;ctx.setTransform(2,0,0,2,0,0);
      const cw=r.width,ch=r.height,rl=cw*.35,rr=cw*.65,lw=(rr-rl)/3;
      gsRef.current.px=rl+lw/2-18;gsRef.current.py=ch-120;gsRef.current.pw=36;gsRef.current.ph=64;
    };
    resize();window.addEventListener("resize",resize);

    const kd=(e:KeyboardEvent)=>{
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","z","Z","x","X","h","H","Enter","Escape"].includes(e.key)){e.preventDefault();keysRef.current.add(e.key);}
      if(e.key==="Escape"&&phRef.current==="playing")startParking();
      if(e.key==="Enter"&&phRef.current==="parking")confirmParking();
    };
    const ku=(e:KeyboardEvent)=>keysRef.current.delete(e.key);
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    let last=performance.now();

    const loop=(t:number)=>{
      const dt=Math.min((t-last)/16,3);last=t;
      const g=gsRef.current,ph=phRef.current;
      const r=cv.getBoundingClientRect();const cw=r.width,ch=r.height;
      const rl=cw*.35,rr=cw*.65,rw=rr-rl,lw=rw/3;
      const LANES=[rl+lw/2-18,rl+lw+lw/2-18,rl+2*lw+lw/2-18];

      const sky=ctx.createLinearGradient(0,0,0,ch);
      sky.addColorStop(0,"#3B82C4");sky.addColorStop(.45,"#8BBCE0");sky.addColorStop(1,"#C8E0C0");
      ctx.fillStyle=sky;ctx.fillRect(0,0,cw,ch);
      const sun=ctx.createRadialGradient(cw*.85,ch*.07,0,cw*.85,ch*.07,50);
      sun.addColorStop(0,"rgba(255,245,180,0.9)");sun.addColorStop(1,"rgba(255,245,180,0)");ctx.fillStyle=sun;ctx.beginPath();ctx.arc(cw*.85,ch*.07,50,0,Math.PI*2);ctx.fill();
      
      ctx.fillStyle="rgba(255,255,255,0.25)";const cloudOff=(g.bgOff*.15)%800;
      [[.15,.06,60,18],[.4,.04,80,20],[.7,.08,55,15],[.9,.03,70,17]].forEach(([cx2,cy2,w2,h2])=>{ctx.beginPath();ctx.ellipse(cw*cx2+Math.sin(cloudOff/w2+cx2*10)*20,ch*cy2,w2,h2,0,0,Math.PI*2);ctx.fill();});
      
      ctx.fillStyle="rgba(140,130,110,0.22)";ctx.beginPath();ctx.moveTo(0,ch*.38);
      [[0,.35],[.1,.24],[.2,.3],[.3,.18],[.42,.28],[.55,.15],[.65,.25],[.75,.2],[.88,.28],[1,.22],[1,.38]].forEach(([mx,my])=>ctx.lineTo(cw*mx,ch*my));ctx.closePath();ctx.fill();

      ctx.fillStyle="#C8B89A";ctx.fillRect(0,0,rl,ch);ctx.fillRect(rr,0,cw-rr,ch);
      const to=g.bgOff%36;ctx.strokeStyle="rgba(0,0,0,0.05)";ctx.lineWidth=1;
      for(let ty=-36+to;ty<ch;ty+=36){ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(rl,ty);ctx.stroke();ctx.beginPath();ctx.moveTo(rr,ty);ctx.lineTo(cw,ty);ctx.stroke();}
      for(let tx=0;tx<rl;tx+=16){ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx,ch);ctx.stroke();}
      for(let tx=rr;tx<cw;tx+=16){ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx,ch);ctx.stroke();}
      ctx.fillStyle="#A89880";ctx.fillRect(rl-5,0,5,ch);ctx.fillRect(rr,0,5,ch);ctx.fillStyle="#E8DCC8";ctx.fillRect(rl-2,0,2,ch);ctx.fillRect(rr+3,0,2,ch);

      const rd=ctx.createLinearGradient(rl,0,rr,0);
      rd.addColorStop(0,"#3a342e");rd.addColorStop(.15,"#453e36");rd.addColorStop(.5,"#4a4238");rd.addColorStop(.85,"#453e36");rd.addColorStop(1,"#3a342e");
      ctx.fillStyle=rd;ctx.fillRect(rl,0,rw,ch);
      ctx.fillStyle="rgba(0,0,0,0.02)";for(let ry=0;ry<ch;ry+=6){ctx.fillRect(rl,ry+((ry/6)%2)*3,rw,1);}
      ctx.strokeStyle="#f5c518";ctx.lineWidth=2;ctx.setLineDash([20,16]);ctx.lineDashOffset=-g.roadOff;
      for(let i=1;i<3;i++){const lx=rl+i*lw;ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,ch);ctx.stroke();}
      ctx.setLineDash([]);ctx.strokeStyle="#f0ece0";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(rl+3,0);ctx.lineTo(rl+3,ch);ctx.moveTo(rr-3,0);ctx.lineTo(rr-3,ch);ctx.stroke();

      g.rms.forEach(rm=>{if(rm.type==="zebra"){const sw=rw/10;for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,rm.y,sw,14);}}else if(rm.type==="stop_line"){ctx.fillStyle="#fff";ctx.fillRect(rl,rm.y,rw,4);}});
      g.bldgs.forEach(b=>{if(b.y>-b.h-30&&b.y<ch+20)drawBldg(ctx,b,b.side==="L"?rl:rr);});
      g.trees.forEach(tr=>{if(tr.y<-80||tr.y>ch+20)return;if(tr.type==="palm")drawPalm(ctx,tr.x,tr.y+50*tr.scale,tr.scale);else if(tr.type==="olive")drawOlive(ctx,tr.x,tr.y+15*tr.scale,tr.scale);else drawCypress(ctx,tr.x,tr.y+10*tr.scale,tr.scale);});
      g.lights.forEach(l=>{if(l.y>-60&&l.y<ch+20)drawSL(ctx,l.x,l.y+50);});
      g.govs.forEach(gv=>{if(gv.y>-60&&gv.y<ch+20)drawGovSignBox(ctx,gv.x,gv.y,gv.dest,gv.km,gv.side);});

      g.inters.forEach(inter=>{
        const top=inter.y,bot=inter.y+inter.width;if(bot<-20||top>ch+20)return;
        ctx.fillStyle="#3e3832";ctx.fillRect(0,top,cw,inter.width);
        ctx.strokeStyle="#f0ece0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,top+2);ctx.lineTo(cw,top+2);ctx.moveTo(0,bot-2);ctx.lineTo(cw,bot-2);ctx.stroke();
        const hlw=inter.width/2;ctx.strokeStyle="#f5c518";ctx.lineWidth=1.8;ctx.setLineDash([14,10]);
        ctx.beginPath();ctx.moveTo(0,top+hlw);ctx.lineTo(rl,top+hlw);ctx.stroke();ctx.beginPath();ctx.moveTo(rr,top+hlw);ctx.lineTo(cw,top+hlw);ctx.stroke();ctx.setLineDash([]);
        ctx.strokeStyle="#ddd";ctx.lineWidth=1;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(rl+3,top+hlw);ctx.lineTo(rr-3,top+hlw);ctx.stroke();ctx.setLineDash([]);
        const zy=bot+4,sw=rw/10;for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,zy,sw,12);}ctx.fillStyle="#fff";ctx.fillRect(rl,zy+14,rw,3);
        const zy2=top-16;for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,zy2,sw,12);}
        drawTLBox(ctx,rr+14,bot+8,inter.lightState);
        inter.crossTraffic.forEach(car=>{if(car.y>top&&car.y<bot&&car.x>-80&&car.x<cw+80)drawHCar(ctx,car.x,car.y,car.w,car.h,car.color);});
      });

      g.obs.forEach(o=>{
        if(!o.active)return;const cx2=o.x+o.w/2;
        switch(o.kind){
          case"pothole":drawPothole(ctx,o.x,o.y,o.w,o.h);break;case"speedbump":drawSpeedbump(ctx,o.x,o.y,o.w);break;
          case"pedestrian":drawPedestrian(ctx,cx2,o.y+14,(o.data?.dir as number)||1,o.hit);break;case"cat":drawCat(ctx,cx2,o.y+8,(o.data?.dir as number)||1);break;
          case"cone":drawCone(ctx,cx2,o.y+o.h);break;case"slow_car":drawSlowCar(ctx,o.x,o.y,o.w,o.h,(o.data?.color as string)||"#2563EB");break;
          case"speed_sign":drawSpeedSign(ctx,cx2,o.y+16,(o.data?.limit as number)||60);break;case"stop_sign":drawStopSignBox(ctx,cx2,o.y+16);break;
        }
      });

      g.ptcs.forEach(p=>{ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;

      if(ph==="parking"&&!g.parking.confirmed){parkAlignRef.current=drawParkingZone(ctx,g.parking,g.px,g.py,g.pw,g.ph);setParkAlign(Math.round(parkAlignRef.current*100));}

      drawPlayerCar(ctx,g.px,g.py,g.pw,g.ph,g.speed,g.lb,g.rb,g.bt);

      if(ph==="playing"){
        g.bt++;if(g.sigT>0){g.sigT--;if(g.sigT===0){g.lb=false;g.rb=false;}}if(g.hornT>0)g.hornT-=dt;
        const keys=keysRef.current;const wasZero=g.speed===0;
        if(keys.has("ArrowUp"))g.speed=Math.min(g.speed+.14,6);
        else if(keys.has(" ")||keys.has("ArrowDown")){g.speed=Math.max(g.speed-.35,0);if(g.speed>0)sndRef.current?.playBrake();}
        else g.speed=Math.min(g.speed+.03,4.5);
        if(wasZero&&g.speed>0.1)sndRef.current?.playTick();sndRef.current?.updateEngine(g.speed);
        if((keys.has("h")||keys.has("H"))&&g.hornT<=0){g.hornT=40;sndRef.current?.playHorn();}
        if(keys.has("z")||keys.has("Z")){if(!g.lb){g.lb=true;g.rb=false;g.sigT=45;sndRef.current?.playIndicator();const upcoming=g.inters.find(i2=>{const sy=i2.y+i2.width+21;return sy>g.py&&sy<g.py+400;});if(upcoming){flash("⚠️ تحذير: قمت بتشغيل الغماز في الوقت الصحيح!","warn");sndRef.current?.playWarning();}}}
        if(keys.has("x")||keys.has("X")){if(!g.rb){g.rb=true;g.lb=false;g.sigT=45;sndRef.current?.playIndicator();const upcoming=g.inters.find(i2=>{const sy=i2.y+i2.width+21;return sy>g.py&&sy<g.py+400;});if(upcoming){flash("⚠️ تحذير: قمت بتشغيل الغماز في الوقت الصحيح!","warn");sndRef.current?.playWarning();}}}
        if(keys.has("ArrowLeft")&&!g.lcIng&&g.currentLane>0){g.targetLane=g.currentLane-1;g.lcIng=true;g.lcT=0;g.lb=true;g.rb=false;g.sigT=60;g.sigUsed=true;sndRef.current?.playIndicator();}
        if(keys.has("ArrowRight")&&!g.lcIng&&g.currentLane<2){g.targetLane=g.currentLane+1;g.lcIng=true;g.lcT=0;g.rb=true;g.lb=false;g.sigT=60;g.sigUsed=true;sndRef.current?.playIndicator();}
        if(g.lcIng){g.lcT+=dt*.08;const tt=Math.min(g.lcT,1);const e=tt<.5?2*tt*tt:1-Math.pow(-2*tt+2,2)/2;g.px=LANES[g.currentLane]+(LANES[g.targetLane]-LANES[g.currentLane])*e;if(tt>=1){g.currentLane=g.targetLane;g.lcIng=false;}}
        else{g.px+=(LANES[g.currentLane]-g.px)*.08;}
        g.px=Math.max(rl+4,Math.min(rr-g.pw-4,g.px));
        const vs=g.speed*dt*1.2;g.roadOff=(g.roadOff+vs)%36;g.bgOff=(g.bgOff+vs*.6)%5000;g.dist+=g.speed*dt*.4;setDist(Math.floor(g.dist));
        const scrArr=(arr:{y:number}[])=>arr.forEach(o=>o.y+=vs*.75);
        scrArr(g.trees);scrArr(g.lights);scrArr(g.govs);scrArr(g.bldgs);g.rms.forEach(rm=>rm.y+=vs);
        g.trees=g.trees.filter(t2=>t2.y<ch+30);while(g.trees.length<16){const side=Math.random()>.5?"L":"R";const tp=(["palm","olive","cypress"]as const)[Math.floor(Math.random()*3)];g.trees.push({x:side==="L"?rl-12-Math.random()*20:rr+12+Math.random()*20,y:-(60+Math.random()*50),scale:.4+Math.random()*.3,type:tp});}
        g.lights=g.lights.filter(l=>l.y<ch+30);while(g.lights.length<8)g.lights.push({x:Math.random()>.5?rl-3:rr+3,y:-(40+Math.random()*30)});
        g.govs=g.govs.filter(gv=>gv.y<ch+30);g.bldgs=g.bldgs.filter(b=>b.y<ch+30);g.rms=g.rms.filter(rm=>rm.y<ch+30);

        g.inters.forEach(inter=>{
          inter.y+=vs*.75;inter.lightTimer+=dt;const cyc=inter.cycleDuration;const phase2=inter.lightTimer%cyc;
          if(phase2<cyc*.45)inter.lightState="green";else if(phase2<cyc*.55)inter.lightState="yellow";else inter.lightState="red";
          if(inter.lightState==="red"&&inter.lightTimer-inter.lastSpawn>50){inter.lastSpawn=inter.lightTimer;const fromL=Math.random()>.5;const ly=inter.y+(fromL?inter.width*.25:inter.width*.75);inter.crossTraffic.push({id:Date.now()+Math.random(),x:fromL?-60:cw+10,y:ly-10,w:52,h:22,speed:(fromL?1:-1)*(2+Math.random()*2),color:CAR_COLS[Math.floor(Math.random()*CAR_COLS.length)]});}
          inter.crossTraffic.forEach(car=>{car.x+=car.speed*dt;});inter.crossTraffic=inter.crossTraffic.filter(car=>car.x>-80&&car.x<cw+80);
          const stopY=inter.y+inter.width+21;const inZ=stopY>g.py-250&&stopY<g.py+30;if(inZ)inter.approached=true;
          if(inter.approached&&!inter.violated&&!inter.scored){if(stopY>g.py-5){if(inter.lightState==="red"&&g.speed>.4){inter.violated=true;pen("intersections","تجاوزت الضوء الأحمر!");pen("traffic_attention");pen("sign_compliance");}else if(inter.lightState==="red"&&g.speed<.3){inter.scored=true;rew("intersections","ممتاز! وقفت عند الضوء الأحمر");}else if(inter.lightState==="green"){inter.scored=true;}inter.approached=false;}}
          if(g.py<inter.y+inter.width+30&&g.py+g.ph>inter.y-10){inter.crossTraffic.forEach(car=>{if(g.px<car.x+car.w&&g.px+g.pw>car.x&&g.py<car.y+car.h&&g.py+g.ph>car.y){if(!inter.violated){inter.violated=true;pen("vehicles","اصطدمت بسيارة في التقاطع!");pen("intersection_gap");for(let i=0;i<12;i++)g.ptcs.push({x:g.px+g.pw/2,y:g.py,vx:(Math.random()-.5)*6,vy:-Math.random()*5,life:45,ml:45,color:"#ef4444",size:3+Math.random()*3});}}});}
        });
        g.inters=g.inters.filter(i=>i.y<ch+150);

        g.obs.forEach(o=>{if(!o.active)return;o.y+=vs*o.vy+o.vy*dt;o.x+=o.vx*dt;if(o.kind==="pedestrian"||o.kind==="cat")o.x+=(o.data?.dir as number)*1.2*dt||0;});
        g.obs=g.obs.filter(o=>o.y<ch+60&&o.x>-80&&o.x<cw+80);
        g.obs.forEach(o=>{if(!o.active||o.hit)return;const hit=g.px<o.x+o.w&&g.px+g.pw>o.x&&g.py<o.y+o.h&&g.py+g.ph>o.y;if(!hit)return;o.hit=true;for(let i=0;i<8;i++)g.ptcs.push({x:g.px+g.pw/2,y:g.py,vx:(Math.random()-.5)*5,vy:-Math.random()*4,life:40,ml:40,color:"#ef4444",size:2+Math.random()*3});switch(o.kind){case"pothole":pen("road_conditions","اصطدمت بحفرة!");pen("steering_control");break;case"speedbump":pen("road_conditions","تجاهلت المطب!");break;case"stop_sign":pen("stop_signs","تجاهلت إشارة قف!");break;case"pedestrian":pen("pedestrians","اصطدمت بمشاة!");break;case"cat":pen("road_env","اصطدمت بقطة ضالة!");break;case"slow_car":pen("vehicles","اصطدمت بمركبة!");break;case"cone":pen("obstacles","اصطدمت بمخروط!");break;}});
        g.obs.forEach(o=>{if(o.kind==="stop_sign"&&o.active&&!o.scored){if(Math.abs(g.py-o.y)<80&&g.speed<.3){o.scored=true;rew("stop_signs","وقفت عند إشارة القف");}}if(o.kind==="pedestrian"&&o.active&&!o.scored){if(Math.abs(g.py-o.y)<80&&g.speed<.4){o.scored=true;rew("pedestrians","أعطيت الأولوية للمشاة");}}});
        const offR=g.px<rl+5||g.px+g.pw>rr-5;if(offR){g.offRT+=dt;if(g.offRT>25){pen("lane_keeping","خروج عن المسار!");pen("steering_control");}}else g.offRT=Math.max(0,g.offRT-dt*.5);
        if(g.lcIng&&!g.sigUsed){pen("indicator_use","نسيت الغماز!");pen("indicator_procedure");}
        const carAhead=g.obs.find(o=>o.kind==="slow_car"&&o.active&&!o.hit&&Math.abs(o.x-g.px)<35&&o.y>g.py&&o.y-g.py<60);
        if(carAhead){g.ttT+=dt;if(g.ttT>35){pen("intersection_gap","المسافة الأمنية غير كافية!");}}else g.ttT=Math.max(0,g.ttT-dt);
        g.ptcs.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life-=2;});g.ptcs=g.ptcs.filter(p=>p.life>0);
        if(g.flashT>0){g.flashT-=dt;if(g.flashT<=0){g.flashMsg="";setFMsg("");}}
        if(g.dist>=g.niDist){spawnInter(g,cw,ch,rl,rr,rw,lw);g.niDist+=2000+Math.random()*1200;}
        if(g.dist>=g.noDist){spawnObs(g,cw,ch,rl,rr,rw,lw,LANES);g.noDist+=500+Math.random()*400;}
        if(g.dist>=g.nbDist){spawnBldg(g,cw,ch,rl,rr);g.nbDist+=250+Math.random()*200;}
        if(g.dist>=g.ntDist&&g.govs.length<2){const govs=[{dest:"إربد",km:80},{dest:"العقبة",km:330},{dest:"عمّان",km:0}];const gv=govs[Math.floor(Math.random()*govs.length)];const side=Math.random()>.5?"L":"R";g.govs.push({x:side==="L"?rl-6:rr+6,y:-(200+Math.random()*300),dest:gv.dest,km:gv.km,side});g.ntDist+=8000+Math.random()*5000;}
        if(g.dist>=TARGET_DIST)startParking();
      }

      if(ph==="parking"&&!g.parking.confirmed){
        const keys2=keysRef.current;const mv=1.8*dt;
        if(keys2.has("ArrowLeft"))g.px-=mv;if(keys2.has("ArrowRight"))g.px+=mv;
        if(keys2.has("ArrowUp"))g.py-=mv;if(keys2.has("ArrowDown"))g.py+=mv;
        g.px=Math.max(rl+4,Math.min(rr-g.pw-4,g.px));g.py=Math.max(20,Math.min(ch-g.ph-60,g.py));
        parkTimerRef.current-=dt;if(parkTimerRef.current<=0){parkTimerRef.current=0;confirmParking();}
        setParkTimer(Math.ceil(parkTimerRef.current/60));
      }

      if(g.flashMsg&&(ph==="playing"||ph==="parking")){
        const colors={pen:"rgba(239,68,68,0.85)",rew:"rgba(34,197,94,0.85)",warn:"rgba(245,158,11,0.9)",info:"rgba(59,130,246,0.85)"};
        const txtC={pen:"#fecaca",rew:"#bbf7d0",warn:"#fef3c7",info:"#bfdbfe"};
        ctx.fillStyle=colors[g.flashType]||colors.info;ctx.beginPath();ctx.roundRect(cw/2-170,14,340,40,12);ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.15)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cw/2-170,14,340,40,12);ctx.stroke();
        ctx.fillStyle=txtC[g.flashType]||"#fff";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText(g.flashMsg,cw/2,39);
      }

      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resize);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);snd.destroy();sndRef.current=null;};
  },[pen,rew,flash,startParking,confirmParking]);

  function spawnInter(g:GS,cw:number,ch:number,rl:number,rr:number,rw:number,lw:number){
    const sp=Math.random()>.5?0:.45;g.inters.push({id:Date.now(),y:-120,width:85,lightState:sp===0?"green":"red",lightTimer:sp*360||0,cycleDuration:360+Math.random()*80,crossTraffic:[],scored:false,violated:false,approached:false,lastSpawn:0});
    g.rms.push({y:-120+85+4,type:"zebra"});g.rms.push({y:-120+85+18,type:"stop_line"});g.rms.push({y:-120-16,type:"zebra"});
  }
  function spawnObs(g:GS,cw:number,ch:number,rl:number,rr:number,rw:number,lw:number,LANES:number[]){
    const id=Date.now();const lane=Math.floor(Math.random()*3);const lx=LANES[lane];
    const kinds=["pothole","speedbump","slow_car","pedestrian","cat","cone","stop_sign","speed_sign"];const kind=kinds[Math.floor(Math.random()*kinds.length)];
    const base={id,active:true,hit:false,scored:false,vy:1,vx:0};
    switch(kind){
      case"pothole":g.obs.push({...base,kind,x:lx+2,y:-40,w:30,h:14});break;
      case"speedbump":g.obs.push({...base,kind,x:rl,y:-25,w:rw,h:10});break;
      case"slow_car":g.obs.push({...base,kind,x:lx,y:-160,w:36,h:64,vy:.4,data:{color:CAR_COLS[Math.floor(Math.random()*CAR_COLS.length)]}});break;
      case"pedestrian":{const d=Math.random()>.5?1:-1;const py=ch*.2+Math.random()*ch*.3;g.obs.push({...base,kind,x:d>0?rl-15:rr+5,y:py,w:16,h:32,vx:0,vy:0,data:{dir:d}});g.rms.push({y:py,type:"zebra"});break;}
      case"cat":{const d=Math.random()>.5?1:-1;g.obs.push({...base,kind,x:d>0?rl-10:rr,y:-60,w:14,h:12,vx:0,vy:1,data:{dir:d}});break;}
      case"cone":g.obs.push({...base,kind,x:lx,y:-60,w:16,h:24});break;
      case"stop_sign":g.obs.push({...base,kind,x:rr-40,y:-130,w:30,h:55});g.rms.push({y:-75,type:"stop_line"});break;
      case"speed_sign":g.obs.push({...base,kind,x:rr-40,y:-110,w:34,h:42,data:{limit:[40,60,80][Math.floor(Math.random()*3)]}});break;
    }
  }
  function spawnBldg(g:GS,cw:number,ch:number,rl:number,rr:number){
    const side=Math.random()>.5?"L":"R";const sw=side==="L"?rl-4:cw-rr-4;const tmpl=BLDS[Math.floor(Math.random()*BLDS.length)];
    const bw=Math.min(tmpl.type==="university"||tmpl.type==="school"?sw*.7:sw*.5,sw*.75);
    const bh=tmpl.type==="university"?70:tmpl.type==="school"?55:tmpl.type==="gov"?60:tmpl.type==="mosque"?55:40+Math.random()*15;
    g.bldgs.push({y:-(40+Math.random()*30),side,label:tmpl.label,sub:tmpl.sub,w:bw,h:bh,color:tmpl.color,awc:tmpl.awc,hasAw:tmpl.hasAw,type:tmpl.type});
  }

  const resetGame=()=>{
    const ng=mkGS();const r=canvasRef.current?.getBoundingClientRect();
    if(r){const cw=r.width,ch=r.height,rl=cw*.35,rr=cw*.65,lw=(rr-rl)/3;ng.px=rl+lw/2-18;ng.py=ch-120;
      for(let i=0;i<8;i++){const side=Math.random()>.5?"L":"R";const tp=(["palm","olive","cypress"]as const)[Math.floor(Math.random()*3)];ng.trees.push({x:side==="L"?rl-12-Math.random()*20:rr+12+Math.random()*20,y:-60-i*180,scale:.4+Math.random()*.3,type:tp});}
      for(let i=0;i<6;i++)ng.lights.push({x:i%2===0?rl-3:rr+3,y:-40-i*250});for(let i=0;i<4;i++)spawnBldg(ng,cw,ch,rl,rr);}
    gsRef.current=ng;const ns=mkSc();scRef.current=ns;setSc({...ns});setDist(0);setFMsg("");setShowPanel(true);setScoreRevealed(false);
  };

  const startGame=()=>{if(!sndRef.current){sndRef.current=new SoundEngine();}sndRef.current.init();sndRef.current.setMuted(muted);sndRef.current.resume();resetGame();phRef.current="playing";setPhase("playing");};
  const toggleMute=()=>{const m=!muted;setMuted(m);sndRef.current?.setMuted(m);};

  const totalSc=SCORES.reduce((s,i)=>s+sc[i.key],0);
  const maxSc=SCORES.reduce((s,i)=>s+i.max,0);
  const passed=totalSc>=75;
  const prog=Math.min(dist/TARGET_DIST*100,100);
  const secData=[1,2,3,4,5,6,7,8].map(s=>{const items=SCORES.filter(i=>i.section===s);return{sec:s,name:SEC_NAMES[s],scored:items.reduce((a,i)=>a+sc[i.key],0),max:items.reduce((a,i)=>a+i.max,0)};});

  return(
    <div className="fixed inset-0 bg-[#0c0f1a] overflow-hidden select-none" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>

      {(phase==="playing"||phase==="parking")&&(
        <button onClick={toggleMute} className="absolute left-3 bottom-16 z-20 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all active:scale-90" title={muted?"تشغيل الصوت":"كتم الصوت"}>
          {muted?"🔇":"🔊"}
        </button>
      )}

      {showPanel&&phase==="playing"&&(
        <div className="absolute right-0 top-0 bottom-14 w-60 bg-[#0c0f1a]/80 backdrop-blur-xl border-l border-white/[0.06] overflow-y-auto p-3 z-20" style={{scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.1) transparent"}}>
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/><span className="text-[10px] font-bold text-amber-300/90 uppercase tracking-[0.2em]">تقييم مباشر</span></div><button onClick={()=>setShowPanel(false)} className="text-white/30 hover:text-white/70 text-xs transition-colors">✕</button></div>
          {secData.map(s=>{const p=s.max>0?s.scored/s.max*100:0;return(<div key={s.sec} className="mb-2.5 group"><div className="flex justify-between text-[9px] mb-1"><span className="text-white/40 group-hover:text-white/60 transition-colors">{s.sec}. {s.name}</span><span className={`font-bold tabular-nums ${p>=75?"text-emerald-400":p>=50?"text-amber-400":"text-red-400"}`}>{s.scored}/{s.max}</span></div><div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{width:`${p}%`,background:p>=75?"linear-gradient(90deg,#059669,#34d399)":p>=50?"linear-gradient(90deg,#d97706,#fbbf24)":"linear-gradient(90deg,#dc2626,#f87171)"}}/></div></div>);})}
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">{SCORES.map(si=>{const v=sc[si.key],f=v===0;return(<div key={si.key} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all ${f?"bg-red-500/[0.08] border border-red-500/10":"bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"}`}><span className={`text-[8px] leading-tight transition-colors ${f?"text-red-400/80 line-through":"text-white/35"}`} dir="rtl">{f?"✗":"✓"} {si.label}</span><span className={`text-[8px] font-bold tabular-nums shrink-0 ml-2 ${f?"text-red-400":"text-white/20"}`}>{v}/{si.max}</span></div>);})}</div>
          <div className="mt-3 pt-3 border-t border-white/[0.06]"><div className="relative h-2.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="absolute inset-0 rounded-full" style={{background:"linear-gradient(90deg,#dc2626 0%,#f59e0b 50%,#22c55e 75%,#059669 100%)"}}/><div className="absolute top-0 h-full w-[2px] bg-white/40" style={{left:"75%"}}/><div className="absolute top-[-2px] h-[calc(100%+4px)] w-2 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-700" style={{left:`${Math.min(totalSc/maxSc*100,100)}%`,transform:"translateX(-50%)"}}/></div><p className="text-[8px] text-white/20 mt-1.5 text-center">حد النجاح 75/100</p></div>
        </div>
      )}

      {!showPanel&&phase==="playing"&&(<button onClick={()=>setShowPanel(true)} className="absolute right-3 top-3 z-20 w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/70 transition-all active:scale-90">📊</button>)}

      {phase==="playing"&&(
        <div className="absolute top-3 left-3 right-[260px] flex items-start justify-between pointer-events-none z-10">
          <div className="space-y-2">
            <div className="px-4 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20"><p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">المسافة</p><p className="text-lg font-extrabold text-white font-mono tabular-nums">{dist.toLocaleString()} <span className="text-[10px] text-white/30 font-normal">م</span></p></div>
            <div className="px-4 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20"><p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">السرعة</p><div className="flex items-end gap-1"><p className="text-2xl font-extrabold text-white font-mono tabular-nums">{Math.floor(gsRef.current.speed*20)}</p><p className="text-[9px] text-white/25 mb-1">كم/س</p></div><div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-200" style={{width:`${Math.min(gsRef.current.speed/6*100,100)}%`,background:gsRef.current.speed>4.5?"#ef4444":gsRef.current.speed>3?"#f59e0b":"#22c55e"}}/></div></div>
            <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06]"><p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-1">المسرب</p><div className="flex gap-1.5">{[0,1,2].map(i=>(<div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${gsRef.current.currentLane===i?"bg-amber-400 shadow-md shadow-amber-400/30":"bg-white/[0.08]"}`}/>))}</div></div>
          </div>
          <div className="text-right"><div className="px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.06] shadow-xl shadow-black/20"><p className="text-[8px] text-amber-200/40 uppercase tracking-[0.25em] font-semibold mb-0.5">العلامة الحالية</p><div className="flex items-end justify-end gap-1.5"><p className={`text-4xl font-black font-mono tabular-nums ${passed?"text-emerald-300":totalSc<50?"text-red-300":"text-amber-300"}`}>{totalSc}</p><p className="text-xs text-white/20 mb-1.5">/ {maxSc}</p></div><div className={`text-[10px] font-bold mt-1 ${passed?"text-emerald-400/70":"text-red-400/60"}`}>{passed?"✓ فوق حد النجاح":"✗ تحت حد النجاح"}</div></div></div>
        </div>
      )}

      {phase==="playing"&&(
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-[#0c0f1a]/85 backdrop-blur-2xl border-t border-white/[0.06] flex items-center px-5 gap-5 z-10">
          <div className="flex-1 min-w-0"><div className="flex justify-between text-[8px] text-white/25 mb-1"><span>تقدّم الفحص</span><span className="tabular-nums">{prog.toFixed(1)}%</span></div><div className="h-2 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:`${prog}%`,background:"linear-gradient(90deg,#d97706,#f59e0b,#fbbf24)"}}/></div><p className="text-[8px] text-white/20 mt-0.5 tabular-nums">{dist.toLocaleString()} / {TARGET_DIST.toLocaleString()} م</p></div>
          <div className="flex items-center gap-2.5 text-[8px] text-white/30 shrink-0">{([["↑","تسارع"],["↓","فرملة"],["Space","طوارئ"],["←→","مسرب"],["Z","غماز←"],["X","غماز→"],["H","بوق"]] as [string,string][]).map(([k,l])=>(<div key={k} className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] font-mono text-white/40 text-[7px]">{k}</kbd><span className="hidden xl:inline">{l}</span></div>))}</div>
          <button onClick={()=>{startParking();}} className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 text-[10px] font-bold transition-all active:scale-95 shrink-0 whitespace-nowrap">⏹ إنهاء الفحص</button>
        </div>
      )}

      {phase==="parking"&&!gsRef.current.parking.confirmed&&(
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-center"><p className="text-[9px] text-amber-300/60 uppercase tracking-[0.2em] font-bold mb-0.5">وقت الاصطفاف المتبقي</p><p className={`text-4xl font-black font-mono tabular-nums ${parkTimer<=10?"text-red-400 animate-pulse":"text-white"}`}>{parkTimer}</p><p className="text-[9px] text-white/25">ثانية</p></div>
          <div className="absolute top-4 right-4 px-4 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-center"><p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mb-0.5">جودة المحاذاة</p><p className={`text-3xl font-black font-mono tabular-nums ${parkAlign>=80?"text-emerald-400":parkAlign>=50?"text-amber-400":"text-red-400"}`}>{parkAlign}%</p></div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 pointer-events-auto"><p className="text-[11px] text-white/50 text-center">استخدم <span className="text-amber-300 font-bold">الأسهم</span> لتحريك السيارة — ثم اضغط <span className="text-amber-300 font-bold">Enter</span> للتأكيد</p></div>
          <button onClick={confirmParking} className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto px-8 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-bold transition-all active:scale-95">✓ تأكيد الاصطفاف</button>
        </div>
      )}

      {phase==="idle"&&(
        <div className="absolute inset-0 bg-[#0c0f1a]/90 backdrop-blur-2xl flex items-center justify-center z-30">
          <div className="text-center px-6 max-w-2xl w-full">
            <div className="relative mx-auto mb-6 w-24 h-24"><div className="absolute inset-0 rounded-3xl bg-amber-500/10 border border-amber-400/20 rotate-6 animate-pulse"/><div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-400/25 flex items-center justify-center shadow-2xl shadow-amber-500/10"><span className="text-6xl drop-shadow-lg">🇯🇴</span></div></div>
            <h2 className="text-4xl font-black text-white mb-1 tracking-tight">فحص القيادة الأردني</h2><p className="text-sm text-slate-400 mb-7">محاكاة واقعية لشوارع الأردن مع تقييم ذكي وتقاطعات حية</p>
            <div className="grid grid-cols-4 gap-2.5 mb-7">{secData.map(s=>(<div key={s.sec} className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"><p className="font-bold text-white/70 text-[10px] leading-tight group-hover:text-white/90 transition-colors">{s.name}</p><p className="text-amber-400 font-bold mt-1 text-sm tabular-nums">{s.max} <span className="text-[9px] text-amber-400/40">علامة</span></p></div>))}</div>
            <div className="bg-white/[0.03] rounded-2xl p-5 mb-7 border border-white/[0.05]"><p className="text-[10px] text-amber-300/60 uppercase tracking-[0.2em] font-bold mb-3">أدوات التحكم</p><div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/45 leading-8"><div><span className="text-amber-300 font-bold">↑ ↓</span> التسارع والفرملة</div><div><span className="text-amber-300 font-bold">← →</span> تغيير المسرب</div><div><span className="text-amber-300 font-bold">Space</span> فرملة طارئة</div><div><span className="text-amber-300 font-bold">Z / X</span> غماز يسار / يمين</div><div><span className="text-amber-300 font-bold">H</span> بوق السيارة</div><div><span className="text-amber-300 font-bold">Esc</span> إنهاء الفحص مبكراً</div></div><p className="text-[11px] text-white/25 mt-3">اقطع المسافة <span className="text-amber-300/70 font-bold">15,000 متر</span> ثم اصطفّ السيارة بعناية</p></div>
            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-white/20 mb-7">{["🏘️ دكّانة أبو محمود","🏫 مدرسة الصريح","🏛️ دائرة السير","🎓 جامعة اليرموك","🕌 مسجد الحسن","🥘 مطعم المنسف","☕ قهوة أبو الليف","💊 صيدلية الشفاء"].map(t=>(<span key={t} className="bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/[0.04]">{t}</span>))}</div>
            <button onClick={startGame} className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"/><span className="relative text-2xl">▶</span><span className="relative">ابدأ الفحص</span></button>
          </div>
        </div>
      )}

      {phase==="finished"&&(
        <div className="absolute inset-0 bg-[#0c0f1a]/92 backdrop-blur-2xl flex items-center justify-center z-30 overflow-y-auto py-8">
          <div className={`text-center px-6 max-w-lg w-full transition-all duration-700 ${scoreRevealed?"opacity-100 translate-y-0":"opacity-0 translate-y-8"}`}>
            <div className="relative mx-auto mb-4 w-40 h-40"><svg className="w-full h-full -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/><circle cx="60" cy="60" r="52" fill="none" stroke={passed?"#22c55e":"#ef4444"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.min(totalSc/maxSc*100,100)*3.27} 327`} className="transition-all duration-1000 ease-out"/></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><p className={`text-5xl font-black font-mono tabular-nums ${passed?"text-emerald-300":"text-red-300"}`}>{totalSc}</p><p className="text-xs text-white/25">/ {maxSc}</p></div></div>
            <div className={`text-3xl font-black mb-5 ${passed?"text-emerald-300":"text-red-300"}`}>{passed?"🏆 ناجح — مبارك!":"❌ راسب — حاول مجددًا"}</div>
            <div className="grid grid-cols-4 gap-2 mb-5">{secData.map(s=>{const p=s.max>0?s.scored/s.max*100:0;return(<div key={s.sec} className={`rounded-2xl p-2.5 text-center border transition-all ${p>=75?"bg-emerald-500/10 border-emerald-500/15":p>=50?"bg-amber-500/10 border-amber-500/15":"bg-red-500/10 border-red-500/15"}`}><p className="text-[8px] text-white/50 leading-tight mb-0.5">{s.name}</p><p className="font-bold text-white text-sm tabular-nums">{s.scored}<span className="text-white/25 text-[9px]">/{s.max}</span></p></div>);})}</div>
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden mb-4"><div className="absolute inset-0 rounded-full" style={{background:"linear-gradient(90deg,#dc2626 0%,#f59e0b 50%,#22c55e 75%,#059669 100%)"}}/><div className="absolute top-0 h-full w-[2px] bg-white/50" style={{left:"75%"}}/><div className="absolute top-[-2px] h-[calc(100%+4px)] w-2.5 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-1000" style={{left:`${Math.min(totalSc/maxSc*100,100)}%`,transform:"translateX(-50%)"}}/></div>
            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-4 mb-5 max-h-40 overflow-y-auto text-left" style={{scrollbarWidth:"thin"}}><div className="space-y-1">{SCORES.map(si=>{const v=sc[si.key],f=v===0;return(<div key={si.key} className={`flex items-center justify-between text-[9px] px-2 py-1 rounded-lg ${f?"bg-red-500/[0.06]":"bg-transparent"}`}><span className={f?"text-red-400/70 line-through":"text-white/30"} dir="rtl">{f?"✗":"✓"} {si.label}</span><span className={`tabular-nums font-bold ${f?"text-red-400/70":"text-white/15"}`}>{v}/{si.max}</span></div>);})}</div></div>
            <p className="text-[11px] text-white/20 mb-5">المسافة المقطوعة: {dist.toLocaleString()} متر · جودة الاصطفاف: {parkAlign}%</p>
            <button onClick={startGame} className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg inline-flex items-center gap-3 shadow-2xl shadow-amber-600/25 active:scale-95 transition-all overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"/><span className="relative text-2xl">🔄</span><span className="relative">العب مجددًا</span></button>
          </div>
        </div>
      )}
    </div>
  );
}