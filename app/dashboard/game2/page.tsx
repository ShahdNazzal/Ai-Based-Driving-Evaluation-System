"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

interface ScoreItem{key:ScoreKey;label:string;max:number;section:number;}

interface CrossCar{id:number;x:number;y:number;w:number;h:number;speed:number;color:string;}
interface Intersection{id:number;y:number;width:number;lightState:"red"|"green"|"yellow";lightTimer:number;cycleDuration:number;crossTraffic:CrossCar[];scored:boolean;violated:boolean;approached:boolean;lastSpawn:number;}
interface Bldg{y:number;side:"L"|"R";label:string;sub:string;w:number;h:number;color:string;awc:string;hasAw:boolean;type:string;}
interface Obs{id:number;kind:string;x:number;y:number;w:number;h:number;vy:number;vx:number;active:boolean;hit:boolean;scored:boolean;data?:any;}
interface TreeO{x:number;y:number;scale:number;type:"palm"|"olive"|"cypress";}
interface Ptc{x:number;y:number;vx:number;vy:number;life:number;ml:number;color:string;size:number;}
interface RMark{y:number;type:string;}
interface GovS{x:number;y:number;dest:string;km:number;side:string;}

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
  flashMsg:string;flashT:number;
}

/* ═══════════════════════════════════════════════════════════════
   الثوابت
   ═══════════════════════════════════════════════════════════════ */
const SCORES:ScoreItem[]=[
  {key:"seat_adjust",label:"تعديل الكرسي",max:2,section:1},
  {key:"mirror_adjust",label:"تعديل المرايا",max:2,section:1},
  {key:"seatbelt",label:"حزام الأمان",max:2,section:1},
  {key:"start_observe",label:"المراقبة وبدء الحركة",max:2,section:1},
  {key:"driver_behavior",label:"سلوك السائق",max:2,section:1},
  {key:"gear_use",label:"استخدام الغيار",max:4,section:2},
  {key:"road_conditions",label:"الظروف المحيطة",max:3,section:2},
  {key:"steering_control",label:"السيطرة على المقود",max:4,section:2},
  {key:"positioning",label:"التموضع",max:4,section:2},
  {key:"indicator_use",label:"استخدام الغماز",max:3,section:3},
  {key:"lane_keeping",label:"الحفاظ على المسرب",max:4,section:3},
  {key:"turn_selection",label:"اختيار مكان الدوران",max:4,section:3},
  {key:"sign_compliance",label:"مراعاة الشواخص",max:4,section:3},
  {key:"traffic_attention",label:"الانتباه لحركة المرور",max:4,section:4},
  {key:"ground_marks",label:"العلامات الأرضية",max:4,section:4},
  {key:"intersections",label:"التعامل مع المقاطعات",max:4,section:4},
  {key:"indicator_procedure",label:"الغماز عند كل إجراء",max:3,section:4},
  {key:"overtake_timing",label:"اختيار وقت التجاوز",max:3,section:5},
  {key:"overtake_signal",label:"غماز التجاوز",max:2,section:5},
  {key:"overtake_monitor",label:"المراقبة أثناء التجاوز",max:3,section:5},
  {key:"overtake_return",label:"العودة للمسرب بأمان",max:2,section:5},
  {key:"normal_stop",label:"الوقوف العادي",max:2,section:6},
  {key:"sudden_stop",label:"الوقوف المفاجئ",max:3,section:6},
  {key:"intersection_gap",label:"مسافة الأمان بالتقاطع",max:3,section:6},
  {key:"stop_signs",label:"شواخص الوقوف",max:2,section:6},
  {key:"pedestrians",label:"التعامل مع المشاة",max:4,section:7},
  {key:"vehicles",label:"التعامل مع المركبات",max:4,section:7},
  {key:"road_env",label:"بيئة الطريق",max:4,section:7},
  {key:"obstacles",label:"التعامل مع العوائق",max:3,section:7},
  {key:"parking_safe",label:"الوقوف الآمن للرجوع",max:2,section:8},
  {key:"reverse_look",label:"النظر قبل الرجوع",max:2,section:8},
  {key:"reverse_monitor",label:"المراقبة أثناء الرجوع",max:3,section:8},
  {key:"parking_align",label:"الاصطفاف",max:3,section:8},
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
  {type:"house",label:"",sub:"",color:"#C8BCA8",awc:"",hasAw:false},
  {type:"house",label:"",sub:"",color:"#D0C4B0",awc:"",hasAw:false},
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
  c.fillStyle="#6B5030";c.fillRect(x-2*s,y-15*s,4*s,15*s);
  c.fillStyle="#4A7A3A";c.beginPath();c.arc(x,y-20*s,14*s,0,Math.PI*2);c.fill();
  c.fillStyle="#3A6A2A";c.beginPath();c.arc(x-6*s,y-24*s,10*s,0,Math.PI*2);c.fill();c.beginPath();c.arc(x+7*s,y-22*s,9*s,0,Math.PI*2);c.fill();
  c.fillStyle="#5A8A4A";c.beginPath();c.arc(x+2*s,y-28*s,8*s,0,Math.PI*2);c.fill();
}
function drawCypress(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  c.fillStyle="#5A4A30";c.fillRect(x-2*s,y-10*s,4*s,10*s);
  c.fillStyle="#2A5A2A";c.beginPath();c.moveTo(x,y-55*s);c.lineTo(x+8*s,y-10*s);c.lineTo(x-8*s,y-10*s);c.closePath();c.fill();
  c.fillStyle="#1A4A1A";c.beginPath();c.moveTo(x,y-55*s);c.lineTo(x+5*s,y-30*s);c.lineTo(x-5*s,y-30*s);c.closePath();c.fill();
}
function drawSL(c:CanvasRenderingContext2D,x:number,y:number){
  c.strokeStyle="#6b7060";c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-55);c.stroke();
  c.beginPath();c.moveTo(x,y-52);c.lineTo(x+18,y-55);c.stroke();
  c.fillStyle="#4a4a40";c.fillRect(x+13,y-61,20,9);
  const g=c.createRadialGradient(x+23,y-56,0,x+23,y-54,20);g.addColorStop(0,"rgba(255,220,80,0.6)");g.addColorStop(1,"rgba(255,220,80,0)");c.fillStyle=g;c.beginPath();c.ellipse(x+23,y-54,20,12,0,0,Math.PI*2);c.fill();
}
function drawBldg(c:CanvasRenderingContext2D,b:Bldg,re:number){
  const bx=b.side==="L"?re-b.w-4:re+4;
  c.fillStyle="rgba(0,0,0,0.08)";c.fillRect(bx+3,b.y+3,b.w,b.h);
  c.fillStyle=b.color;c.fillRect(bx,b.y,b.w,b.h);c.strokeStyle="rgba(0,0,0,0.15)";c.lineWidth=1;c.strokeRect(bx,b.y,b.w,b.h);
  c.fillStyle="rgba(0,0,0,0.04)";c.fillRect(bx,b.y,b.w,4);
  if(b.hasAw){c.fillStyle=b.awc;c.beginPath();c.moveTo(bx-4,b.y);c.lineTo(bx+b.w+4,b.y);c.lineTo(bx+b.w+7,b.y-9);c.lineTo(bx-7,b.y-9);c.closePath();c.fill();}
  const ww=7,wh=9,cols=Math.floor((b.w-8)/12),rows=Math.floor((b.h-20)/14);
  for(let r=0;r<rows;r++)for(let cc=0;cc<cols;cc++){
    c.fillStyle="rgba(180,215,255,0.55)";c.fillRect(bx+6+cc*12,b.y+8+r*14,ww,wh);
    c.strokeStyle="rgba(0,0,0,0.1)";c.strokeRect(bx+6+cc*12,b.y+8+r*14,ww,wh);
  }
  c.fillStyle="#5D4037";c.fillRect(bx+b.w/2-5,b.y+b.h-16,10,16);
  if(b.type==="mosque"){c.fillStyle="#D0D0D0";c.beginPath();c.arc(bx+b.w/2,b.y-4,10,Math.PI,0);c.fill();c.fillStyle="#C0C0C0";c.fillRect(bx+b.w/2-2,b.y-18,4,14);}
  if(b.type==="gov"||b.type==="university"){drawJFlag(c,bx+b.w-16,b.y-(b.hasAw?12:2),14,9);}
  if(b.label){
    c.save();c.fillStyle="#222";c.font="bold 8px sans-serif";c.textAlign="center";
    const ty=b.y-(b.hasAw?12:3);
    const maxW=b.w+10;
    c.fillText(b.label,bx+b.w/2,ty,maxW);
    if(b.sub){c.font="6.5px sans-serif";c.fillStyle="#666";c.fillText(b.sub,bx+b.w/2,ty-9,maxW);}
    c.restore();
  }
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
  c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,[6,6,4,4]);c.fill();
  c.fillStyle=col+"aa";c.beginPath();c.roundRect(x+w*.2,y+3,w*.6,h*.3,[4,4,1,1]);c.fill();
  c.fillStyle="rgba(180,220,255,0.6)";c.beginPath();c.roundRect(x+w*.25,y+4,w*.5,h*.18,3);c.fill();
  c.fillStyle="#fef9c3";c.fillRect(x+w-4,y+2,4,4);c.fillRect(x+w-4,y+h-6,4,4);
  c.fillStyle="#ef4444";c.fillRect(x,y+2,4,4);c.fillRect(x,y+h-6,4,4);
  c.fillStyle="#fff";c.fillRect(x+w*.35,y+h-7,w*.3,6);c.strokeStyle="#999";c.lineWidth=.4;c.strokeRect(x+w*.35,y+h-7,w*.3,6);
}
function drawTLBox(c:CanvasRenderingContext2D,x:number,y:number,st:string){
  c.strokeStyle="#777";c.lineWidth=2;c.beginPath();c.moveTo(x,y+55);c.lineTo(x,y+90);c.stroke();
  c.fillStyle="#1a1a1a";c.beginPath();c.roundRect(x-9,y,18,52,4);c.fill();
  ([["#ef4444","red",8],["#f59e0b","yellow",28],["#22c55e","green",46]] as [string,string,number][]).forEach(([col,s,ly])=>{
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
  c.fillStyle="#F5A623";c.beginPath();c.ellipse(x,y,6,4,0,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(x+dir*5,y-3,3.5,0,Math.PI*2);c.fill();
  c.fillStyle="#333";c.beginPath();c.arc(x+dir*6,y-4,1,0,Math.PI*2);c.fill();
  c.strokeStyle="#F5A623";c.lineWidth=1;
  c.beginPath();c.moveTo(x-dir*2,y-5);c.lineTo(x-dir*2,y-9);c.moveTo(x+dir*1,y-5);c.lineTo(x+dir*1,y-9);c.stroke();
  c.strokeStyle="#F5A623";c.beginPath();c.moveTo(x-dir*5,y+2);c.quadraticCurveTo(x-dir*8,y+8,x-dir*4,y+6);c.stroke();
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
  c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,[8,8,5,5]);c.fill();
  c.fillStyle=col+"aa";c.beginPath();c.roundRect(x+3,y+6,w-6,h*.35,[6,6,1,1]);c.fill();
  c.fillStyle="rgba(180,220,255,0.65)";c.beginPath();c.roundRect(x+5,y+8,w-10,h*.2,3);c.fill();
  c.fillStyle="#fef9c3";c.fillRect(x+2,y+2,7,4);c.fillRect(x+w-9,y+2,7,4);
  c.fillStyle="#ef4444";c.fillRect(x+2,y+h-6,7,3);c.fillRect(x+w-9,y+h-6,7,3);
  c.fillStyle="#fff";c.fillRect(x+w*.2,y+h-10,w*.6,8);c.fillStyle="#1d4ed8";c.font=`bold ${Math.floor(w*.11)}px monospace`;c.textAlign="center";c.fillText("JO",x+w/2,y+h-4);
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
  const phRef=useRef<"idle"|"playing"|"finished">("idle");

  const[phase,setPhase]=useState<"idle"|"playing"|"finished">("idle");
  const[sc,setSc]=useState<Record<ScoreKey,number>>(mkSc());
  const[dist,setDist]=useState(0);
  const[fMsg,setFMsg]=useState("");
  const[showPanel,setShowPanel]=useState(true);

  function mkGS():GS{return{px:0,py:0,pw:36,ph:64,speed:0,targetLane:1,currentLane:1,lcT:0,lcIng:false,lb:false,rb:false,bt:0,roadOff:0,bgOff:0,dist:0,inters:[],obs:[],trees:[],lights:[],bldgs:[],rms:[],ptcs:[],govs:[],niDist:1800,noDist:600,nbDist:300,ntDist:200,offRT:0,ttT:0,pens:new Set(),sigUsed:false,sigT:0,flashMsg:"",flashT:0};}
  function mkSc(){const s={}as Record<ScoreKey,number>;SCORES.forEach(i=>{s[i.key]=i.max;});return s;}

  const pen=useCallback((k:ScoreKey,msg?:string)=>{
    const g=gsRef.current;if(g.pens.has(k))return;g.pens.add(k);
    const n={...scRef.current,[k]:0};scRef.current=n;setSc({...n});
    if(msg){g.flashMsg=msg;g.flashT=100;setFMsg(msg);}
  },[]);
  const rew=useCallback((k:ScoreKey,msg?:string)=>{
    const g=gsRef.current;if(msg){g.flashMsg="✅ "+msg;g.flashT=80;setFMsg("✅ "+msg);}
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;
    const ctx=cv.getContext("2d");if(!ctx)return;

    const resize=()=>{
      const r=cv.getBoundingClientRect();
      cv.width=r.width*2;cv.height=r.height*2;
      ctx.setTransform(2,0,0,2,0,0);
      const cw=r.width,ch=r.height;
      const rl=cw*.35,rr=cw*.65,lw=(rr-rl)/3;
      gsRef.current.px=rl+lw/2-18;gsRef.current.py=ch-120;gsRef.current.pw=36;gsRef.current.ph=64;
    };
    resize();window.addEventListener("resize",resize);

    const kd=(e:KeyboardEvent)=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","z","Z","x","X"].includes(e.key)){e.preventDefault();keysRef.current.add(e.key);}};
    const ku=(e:KeyboardEvent)=>keysRef.current.delete(e.key);
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    let last=performance.now();

    const loop=(t:number)=>{
      const dt=Math.min((t-last)/16,3);last=t;
      const g=gsRef.current,ph=phRef.current;
      const r=cv.getBoundingClientRect();const cw=r.width,ch=r.height;
      const rl=cw*.35,rr=cw*.65,rw=rr-rl,lw=rw/3;
      const LANES=[rl+lw/2-18,rl+lw+lw/2-18,rl+2*lw+lw/2-18];

      /* ── السماء ── */
      const sky=ctx.createLinearGradient(0,0,0,ch);
      sky.addColorStop(0,"#4A8BC2");sky.addColorStop(.5,"#A0C8E0");sky.addColorStop(1,"#D0E8C8");
      ctx.fillStyle=sky;ctx.fillRect(0,0,cw,ch);
      const sun=ctx.createRadialGradient(cw*.85,ch*.08,0,cw*.85,ch*.08,55);
      sun.addColorStop(0,"rgba(255,240,150,0.85)");sun.addColorStop(1,"rgba(255,240,150,0)");
      ctx.fillStyle=sun;ctx.beginPath();ctx.arc(cw*.85,ch*.08,55,0,Math.PI*2);ctx.fill();

      /* ── الجبال ── */
      ctx.fillStyle="rgba(140,130,110,0.25)";ctx.beginPath();ctx.moveTo(0,ch*.38);
      [[0,.35],[.1,.24],[.2,.3],[.3,.18],[.42,.28],[.55,.15],[.65,.25],[.75,.2],[.88,.28],[1,.22],[1,.38]].forEach(([mx,my])=>ctx.lineTo(cw*mx,ch*my));
      ctx.closePath();ctx.fill();

      /* ── الأرصفة ── */
      ctx.fillStyle="#C8B89A";ctx.fillRect(0,0,rl,ch);ctx.fillRect(rr,0,cw-rr,ch);
      const to=g.bgOff%36;
      ctx.strokeStyle="rgba(0,0,0,0.05)";ctx.lineWidth=1;
      for(let ty=-36+to;ty<ch;ty+=36){ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(rl,ty);ctx.stroke();ctx.beginPath();ctx.moveTo(rr,ty);ctx.lineTo(cw,ty);ctx.stroke();}
      for(let tx=0;tx<rl;tx+=16){ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx,ch);ctx.stroke();}
      for(let tx=rr;tx<cw;tx+=16){ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx,ch);ctx.stroke();}
      ctx.fillStyle="#A89880";ctx.fillRect(rl-5,0,5,ch);ctx.fillRect(rr,0,5,ch);
      ctx.fillStyle="#E8DCC8";ctx.fillRect(rl-2,0,2,ch);ctx.fillRect(rr+3,0,2,ch);

      /* ── الطريق ── */
      const rd=ctx.createLinearGradient(rl,0,rr,0);
      rd.addColorStop(0,"#3a342e");rd.addColorStop(.15,"#453e36");rd.addColorStop(.5,"#4a4238");rd.addColorStop(.85,"#453e36");rd.addColorStop(1,"#3a342e");
      ctx.fillStyle=rd;ctx.fillRect(rl,0,rw,ch);
      ctx.strokeStyle="#f5c518";ctx.lineWidth=2;ctx.setLineDash([20,16]);ctx.lineDashOffset=-g.roadOff;
      for(let i=1;i<3;i++){const lx=rl+i*lw;ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,ch);ctx.stroke();}
      ctx.setLineDash([]);
      ctx.strokeStyle="#f0ece0";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(rl+3,0);ctx.lineTo(rl+3,ch);ctx.moveTo(rr-3,0);ctx.lineTo(rr-3,ch);ctx.stroke();

      /* ── العلامات الأرضية ── */
      g.rms.forEach(rm=>{
        if(rm.type==="zebra"){const sw=rw/10;for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,rm.y,sw,14);}}
        else if(rm.type==="stop_line"){ctx.fillStyle="#fff";ctx.fillRect(rl,rm.y,rw,4);}
      });

      /* ── المباني ── */
      g.bldgs.forEach(b=>{if(b.y>-b.h-30&&b.y<ch+20)drawBldg(ctx,b,b.side==="L"?rl:rr);});

      /* ── الأشجار ── */
      g.trees.forEach(tr=>{
        if(tr.y<-80||tr.y>ch+20)return;
        if(tr.type==="palm")drawPalm(ctx,tr.x,tr.y+50*tr.scale,tr.scale);
        else if(tr.type==="olive")drawOlive(ctx,tr.x,tr.y+15*tr.scale,tr.scale);
        else drawCypress(ctx,tr.x,tr.y+10*tr.scale,tr.scale);
      });

      /* ── أعمدة الإنارة ── */
      g.lights.forEach(l=>{if(l.y>-60&&l.y<ch+20)drawSL(ctx,l.x,l.y+50);});

      /* ── لوحات المحافظات (نادرة) ── */
      g.govs.forEach(gv=>{if(gv.y>-60&&gv.y<ch+20)drawGovSignBox(ctx,gv.x,gv.y,gv.dest,gv.km,gv.side);});

      /* ── التقاطعات ── */
      g.inters.forEach(inter=>{
        const top=inter.y,bot=inter.y+inter.width;
        if(bot<-20||top>ch+20)return;

        ctx.fillStyle="#3e3832";ctx.fillRect(0,top,cw,inter.width);
        ctx.strokeStyle="#f0ece0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,top+2);ctx.lineTo(cw,top+2);ctx.moveTo(0,bot-2);ctx.lineTo(cw,bot-2);ctx.stroke();
        const hlw=inter.width/2;
        ctx.strokeStyle="#f5c518";ctx.lineWidth=1.8;ctx.setLineDash([14,10]);
        ctx.beginPath();ctx.moveTo(0,top+hlw);ctx.lineTo(rl,top+hlw);ctx.stroke();
        ctx.beginPath();ctx.moveTo(rr,top+hlw);ctx.lineTo(cw,top+hlw);ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle="#ddd";ctx.lineWidth=1;ctx.setLineDash([8,8]);
        ctx.beginPath();ctx.moveTo(rl+3,top+hlw);ctx.lineTo(rr-3,top+hlw);ctx.stroke();
        ctx.setLineDash([]);

        const zy=bot+4;const sw=rw/10;
        for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,zy,sw,12);}
        ctx.fillStyle="#fff";ctx.fillRect(rl,zy+14,rw,3);

        const zy2=top-16;
        for(let i=0;i<10;i+=2){ctx.fillStyle="#fff";ctx.fillRect(rl+i*sw,zy2,sw,12);}

        drawTLBox(ctx,rr+14,bot+8,inter.lightState);
        drawTLBox(ctx,rl-14,top-55,inter.lightState==="red"?"green":inter.lightState==="green"?"red":"yellow");

        inter.crossTraffic.forEach(car=>{
          if(car.y>top&&car.y<bot&&car.x>-80&&car.x<cw+80)drawHCar(ctx,car.x,car.y,car.w,car.h,car.color);
        });
      });

      /* ── العوائق ── */
      g.obs.forEach(o=>{
        if(!o.active)return;
        const cx=o.x+o.w/2;
        switch(o.kind){
          case"pothole":drawPothole(ctx,o.x,o.y,o.w,o.h);break;
          case"speedbump":drawSpeedbump(ctx,o.x,o.y,o.w);break;
          case"pedestrian":drawPedestrian(ctx,cx,o.y+14,(o.data?.dir as number)||1,o.hit);break;
          case"cat":drawCat(ctx,cx,o.y+8,(o.data?.dir as number)||1);break;
          case"cone":drawCone(ctx,cx,o.y+o.h);break;
          case"slow_car":drawSlowCar(ctx,o.x,o.y,o.w,o.h,(o.data?.color as string)||"#2563EB");break;
          case"speed_sign":drawSpeedSign(ctx,cx,o.y+16,(o.data?.limit as number)||60);break;
          case"stop_sign":drawStopSignBox(ctx,cx,o.y+16);break;
          default:break;
        }
      });

      /* ── جزيئات ── */
      g.ptcs.forEach(p=>{ctx.globalAlpha=p.life/p.ml;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});
      ctx.globalAlpha=1;

      /* ── سيارة اللاعب ── */
      drawPlayerCar(ctx,g.px,g.py,g.pw,g.ph,g.speed,g.lb,g.rb,g.bt);

      /* ═══════════ تحديث اللعبة ═══════════ */
      if(ph==="playing"){
        g.bt++;
        if(g.sigT>0){g.sigT--;if(g.sigT===0){g.lb=false;g.rb=false;}}
        const keys=keysRef.current;

        if(keys.has("ArrowUp"))g.speed=Math.min(g.speed+.14,6);
        else if(keys.has(" ")||keys.has("ArrowDown"))g.speed=Math.max(g.speed-.35,0);
        else g.speed=Math.min(g.speed+.03,4.5);

        if(keys.has("z")||keys.has("Z")){if(!g.lb){g.lb=true;g.rb=false;g.sigT=45;}}
        if(keys.has("x")||keys.has("X")){if(!g.rb){g.rb=true;g.lb=false;g.sigT=45;}}

        if(keys.has("ArrowLeft")&&!g.lcIng&&g.currentLane>0){
          g.targetLane=g.currentLane-1;g.lcIng=true;g.lcT=0;g.lb=true;g.rb=false;g.sigT=60;g.sigUsed=true;
        }
        if(keys.has("ArrowRight")&&!g.lcIng&&g.currentLane<2){
          g.targetLane=g.currentLane+1;g.lcIng=true;g.lcT=0;g.rb=true;g.lb=false;g.sigT=60;g.sigUsed=true;
        }

        if(g.lcIng){g.lcT+=dt*.08;const t=Math.min(g.lcT,1);const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;g.px=LANES[g.currentLane]+(LANES[g.targetLane]-LANES[g.currentLane])*e;if(t>=1){g.currentLane=g.targetLane;g.lcIng=false;}}
        else{g.px+=(LANES[g.currentLane]-g.px)*.08;}
        g.px=Math.max(rl+4,Math.min(rr-g.pw-4,g.px));

        const vs=g.speed*dt*1.2;
        g.roadOff=(g.roadOff+vs)%36;g.bgOff=(g.bgOff+vs*.6)%5000;g.dist+=g.speed*dt*.4;setDist(Math.floor(g.dist));

        const scrArr=(arr:{y:number}[])=>arr.forEach(o=>o.y+=vs*.75);
        scrArr(g.trees);scrArr(g.lights);scrArr(g.govs);scrArr(g.bldgs);g.rms.forEach(rm=>rm.y+=vs);

        g.trees=g.trees.filter(t=>t.y<ch+30);
        while(g.trees.length<16){
          const side=Math.random()>.5?"L":"R";
          const tp=(["palm","olive","cypress"]as const)[Math.floor(Math.random()*3)];
          g.trees.push({x:side==="L"?rl-12-Math.random()*20:rr+12+Math.random()*20,y:-(60+Math.random()*50),scale:.4+Math.random()*.3,type:tp});
        }
        g.lights=g.lights.filter(l=>l.y<ch+30);
        while(g.lights.length<8)g.lights.push({x:Math.random()>.5?rl-3:rr+3,y:-(40+Math.random()*30)});
        g.govs=g.govs.filter(gv=>gv.y<ch+30);
        g.bldgs=g.bldgs.filter(b=>b.y<ch+30);
        g.rms=g.rms.filter(rm=>rm.y<ch+30);

        /* ── التقاطعات ── */
        g.inters.forEach(inter=>{
          inter.y+=vs*.75;
          inter.lightTimer+=dt;
          const cyc=inter.cycleDuration;
          const phase=inter.lightTimer%cyc;
          if(phase<cyc*.45)inter.lightState="green";
          else if(phase<cyc*.55)inter.lightState="yellow";
          else inter.lightState="red";

          const hGreen=inter.lightState==="red";
          if(hGreen&&inter.lightTimer-inter.lastSpawn>50){
            inter.lastSpawn=inter.lightTimer;
            const fromLeft=Math.random()>.5;
            const laneY=inter.y+(fromLeft?inter.width*.25:inter.width*.75);
            inter.crossTraffic.push({id:Date.now()+Math.random(),x:fromLeft?-60:cw+10,y:laneY-10,w:52,h:22,speed:(fromLeft?1:-1)*(2+Math.random()*2),color:CAR_COLS[Math.floor(Math.random()*CAR_COLS.length)]});
          }
          inter.crossTraffic.forEach(car=>{car.x+=car.speed*dt;});
          inter.crossTraffic=inter.crossTraffic.filter(car=>car.x>-80&&car.x<cw+80);

          const stopLineY=inter.y+inter.width+21;
          const inZone=stopLineY>g.py-250&&stopLineY<g.py+30;
          if(inZone)inter.approached=true;
          if(inter.approached&&!inter.violated&&!inter.scored){
            if(stopLineY>g.py-5){
              if(inter.lightState==="red"&&g.speed>.4){inter.violated=true;pen("intersections","تجاوزت الضوء الأحمر!");pen("traffic_attention");pen("sign_compliance");}
              else if(inter.lightState==="red"&&g.speed<.3){inter.scored=true;rew("intersections","ممتاز! وقفت عند الضوء الأحمر");}
              else if(inter.lightState==="green"){inter.scored=true;}
              inter.approached=false;
            }
          }

          if(g.py<inter.y+inter.width+30&&g.py+g.ph>inter.y-10){
            inter.crossTraffic.forEach(car=>{
              if(g.px<car.x+car.w&&g.px+g.pw>car.x&&g.py<car.y+car.h&&g.py+g.ph>car.y){
                if(!inter.violated){inter.violated=true;pen("vehicles","اصطدمت بسيارة في التقاطع!");pen("intersection_gap");for(let i=0;i<12;i++)g.ptcs.push({x:g.px+g.pw/2,y:g.py,vx:(Math.random()-.5)*6,vy:-Math.random()*5,life:45,ml:45,color:"#ef4444",size:3+Math.random()*3});}
              }
            });
          }
        });
        g.inters=g.inters.filter(i=>i.y<ch+150);

        /* ── العوائق ── */
        g.obs.forEach(o=>{if(!o.active)return;o.y+=vs*o.vy+o.vy*dt;o.x+=o.vx*dt;if(o.kind==="pedestrian"||o.kind==="cat")o.x+=(o.data?.dir as number)*1.2*dt||0;});
        g.obs=g.obs.filter(o=>o.y<ch+60&&o.x>-80&&o.x<cw+80);

        g.obs.forEach(o=>{
          if(!o.active||o.hit)return;
          const hit=g.px<o.x+o.w&&g.px+g.pw>o.x&&g.py<o.y+o.h&&g.py+g.ph>o.y;
          if(!hit)return;o.hit=true;
          for(let i=0;i<8;i++)g.ptcs.push({x:g.px+g.pw/2,y:g.py,vx:(Math.random()-.5)*5,vy:-Math.random()*4,life:40,ml:40,color:"#ef4444",size:2+Math.random()*3});
          switch(o.kind){
            case"pothole":pen("road_conditions","اصطدمت بحفرة!");pen("steering_control");break;
            case"speedbump":pen("road_conditions","تجاهلت المطب!");break;
            case"stop_sign":pen("stop_signs","تجاهلت إشارة قف!");break;
            case"pedestrian":pen("pedestrians","اصطدمت بمشاة!");break;
            case"cat":pen("road_env","اصطدمت بقطة ضالة!");break;
            case"slow_car":pen("vehicles","اصطدمت بمركبة!");break;
            case"cone":pen("obstacles","اصطدمت بمخروط!");break;
          }
        });

        g.obs.forEach(o=>{
          if(o.kind==="stop_sign"&&o.active&&!o.scored){if(Math.abs(g.py-o.y)<80&&g.speed<.3){o.scored=true;rew("stop_signs","وقفت عند إشارة القف");}}
          if(o.kind==="pedestrian"&&o.active&&!o.scored){if(Math.abs(g.py-o.y)<80&&g.speed<.4){o.scored=true;rew("pedestrians","أعطيت الأولوية للمشاة");}}
        });

        const offR=g.px<rl+5||g.px+g.pw>rr-5;
        if(offR){g.offRT+=dt;if(g.offRT>25){pen("lane_keeping","خروج عن المسار!");pen("steering_control");}}else g.offRT=Math.max(0,g.offRT-dt*.5);

        if(g.lcIng&&!g.sigUsed){pen("indicator_use","نسيت الغماز!");pen("indicator_procedure");}

        const carAhead=g.obs.find(o=>o.kind==="slow_car"&&o.active&&!o.hit&&Math.abs(o.x-g.px)<35&&o.y>g.py&&o.y-g.py<60);
        if(carAhead){g.ttT+=dt;if(g.ttT>35){pen("intersection_gap","المسافة الأمنية غير كافية!");}}else g.ttT=Math.max(0,g.ttT-dt);

        g.ptcs.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life-=2;});
        g.ptcs=g.ptcs.filter(p=>p.life>0);

        if(g.flashT>0){g.flashT-=dt;if(g.flashT<=0){g.flashMsg="";setFMsg("");}}

        if(g.dist>=g.niDist){spawnInter(g,cw,ch,rl,rr,rw,lw);g.niDist+=2000+Math.random()*1200;}
        if(g.dist>=g.noDist){spawnObs(g,cw,ch,rl,rr,rw,lw,LANES);g.noDist+=500+Math.random()*400;}
        if(g.dist>=g.nbDist){spawnBldg(g,cw,ch,rl,rr);g.nbDist+=250+Math.random()*200;}
        if(g.dist>=g.ntDist&&g.govs.length<2){
          const govs=[{dest:"إربد",km:80},{dest:"العقبة",km:330},{dest:"عمّان",km:0}];
          const gv=govs[Math.floor(Math.random()*govs.length)];
          const side=Math.random()>.5?"L":"R";
          g.govs.push({x:side==="L"?rl-6:rr+6,y:-(200+Math.random()*300),dest:gv.dest,km:gv.km,side});
          g.ntDist+=8000+Math.random()*5000;
        }

        if(g.dist>=TARGET_DIST){phRef.current="finished";setPhase("finished");}
      }

      /* ── HUD فوق الكانفاس ── */
      if(g.flashMsg&&ph==="playing"){
        ctx.fillStyle="rgba(0,0,0,0.6)";ctx.beginPath();ctx.roundRect(cw/2-150,15,300,38,10);ctx.fill();
        ctx.fillStyle=g.flashMsg.startsWith("✅")?"#6ee7b7":"#fca5a5";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText(g.flashMsg,cw/2,39);
      }

      rafRef.current=requestAnimationFrame(loop);
    };

    rafRef.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resize);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[pen,rew]);

  /* ═══ توليد العناصر ═══ */
  function spawnInter(g:GS,cw:number,ch:number,rl:number,rr:number,rw:number,lw:number){
    const startPhase=Math.random()>.5?0:.45;
    g.inters.push({id:Date.now(),y:-120,width:85,lightState:startPhase===0?"green":"red",lightTimer:startPhase*360||0,cycleDuration:360+Math.random()*80,crossTraffic:[],scored:false,violated:false,approached:false,lastSpawn:0});
    g.rms.push({y:-120+85+4,type:"zebra"});
    g.rms.push({y:-120+85+18,type:"stop_line"});
    g.rms.push({y:-120-16,type:"zebra"});
  }

  function spawnObs(g:GS,cw:number,ch:number,rl:number,rr:number,rw:number,lw:number,LANES:number[]){
    const id=Date.now();
    const lane=Math.floor(Math.random()*3);const lx=LANES[lane];
    const kinds=["pothole","speedbump","slow_car","pedestrian","cat","cone","stop_sign","speed_sign"];
    const kind=kinds[Math.floor(Math.random()*kinds.length)];
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
    const side=Math.random()>.5?"L":"R";
    const sw=side==="L"?rl-4:cw-rr-4;
    const tmpl=BLDS[Math.floor(Math.random()*BLDS.length)];
    const bw=Math.min(tmpl.type==="university"||tmpl.type==="school"?sw*.7:sw*.5,sw*.75);
    const bh=tmpl.type==="university"?70:tmpl.type==="school"?55:tmpl.type==="gov"?60:tmpl.type==="mosque"?55:40+Math.random()*15;
    g.bldgs.push({y:-(40+Math.random()*30),side,label:tmpl.label,sub:tmpl.sub,w:bw,h:bh,color:tmpl.color,awc:tmpl.awc,hasAw:tmpl.hasAw,type:tmpl.type});
  }

  const resetGame=()=>{
    const ng=mkGS();const r=canvasRef.current?.getBoundingClientRect();
    if(r){const cw=r.width,ch=r.height,rl=cw*.35,rr=cw*.65,lw=(rr-rl)/3;
      ng.px=rl+lw/2-18;ng.py=ch-120;
      for(let i=0;i<8;i++){const side=Math.random()>.5?"L":"R";const tp=(["palm","olive","cypress"]as const)[Math.floor(Math.random()*3)];ng.trees.push({x:side==="L"?rl-12-Math.random()*20:rr+12+Math.random()*20,y:-60-i*180,scale:.4+Math.random()*.3,type:tp});}
      for(let i=0;i<6;i++)ng.lights.push({x:i%2===0?rl-3:rr+3,y:-40-i*250});
      for(let i=0;i<4;i++)spawnBldg(ng,cw,ch,rl,rr);
    }
    gsRef.current=ng;const ns=mkSc();scRef.current=ns;setSc({...ns});setDist(0);setFMsg("");setShowPanel(true);
  };

  const startGame=()=>{resetGame();phRef.current="playing";setPhase("playing");};

  const totalSc=SCORES.reduce((s,i)=>s+sc[i.key],0);
  const maxSc=SCORES.reduce((s,i)=>s+i.max,0);
  const passed=totalSc>=75;
  const prog=Math.min(dist/TARGET_DIST*100,100);
  const secData=[1,2,3,4,5,6,7,8].map(s=>{const items=SCORES.filter(i=>i.section===s);return{sec:s,name:SEC_NAMES[s],scored:items.reduce((a,i)=>a+sc[i.key],0),max:items.reduce((a,i)=>a+i.max,0)};});

  return(
    <div className="fixed inset-0 bg-[#1a1a1a] overflow-hidden select-none" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>

      {/* لوحة العلامات الجانبية */}
      {showPanel&&phase==="playing"&&(
        <div className="absolute right-0 top-0 bottom-12 w-56 bg-black/65 backdrop-blur-md border-l border-white/10 overflow-y-auto p-3 z-20" style={{scrollbarWidth:"thin"}}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">العلامات</span>
            <button onClick={()=>setShowPanel(false)} className="text-white/40 hover:text-white text-xs">✕</button>
          </div>
          {secData.map(s=>{const p=s.max>0?s.scored/s.max*100:0;return(
            <div key={s.sec} className="mb-2">
              <div className="flex justify-between text-[9px] mb-0.5"><span className="text-white/60">{s.sec}. {s.name}</span><span className={`font-bold ${p>=75?"text-emerald-300":"text-red-400"}`}>{s.scored}/{s.max}</span></div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:`${p}%`,background:p>=75?"#10b981":p>=50?"#f59e0b":"#ef4444"}}/></div>
            </div>
          );})}
          <div className="mt-3 pt-2 border-t border-white/10 space-y-1.5">
            {SCORES.map(si=>{
              const v=sc[si.key],f=v===0;
              return(<div key={si.key} className={`flex items-center justify-between rounded-lg px-2 py-1 ${f?"bg-red-500/15":"bg-white/5"}`}>
                <span className={`text-[8px] leading-tight ${f?"text-red-400 line-through":"text-white/50"}`} dir="rtl">{f?"✗":"✓"} {si.label}</span>
                <span className={`text-[8px] font-bold shrink-0 ${f?"text-red-400":"text-white/30"}`}>{v}/{si.max}</span>
              </div>);
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full"/>
              <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{left:"75%"}}/>
              <div className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow transition-all" style={{left:`${Math.min(totalSc,100)}%`,transform:"translateX(-50%)"}}/>
            </div>
            <p className="text-[8px] text-white/30 mt-1 text-center">حد النجاح 75/100</p>
          </div>
        </div>
      )}

      {!showPanel&&phase==="playing"&&(
        <button onClick={()=>setShowPanel(true)} className="absolute right-3 top-3 z-20 w-9 h-9 rounded-xl bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white text-sm">📊</button>
      )}

      {/* HUD علوي */}
      {phase==="playing"&&(
        <div className="absolute top-3 left-3 right-16 flex items-start justify-between pointer-events-none z-10">
          <div className="space-y-2">
            <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              <p className="text-[8px] text-amber-200/50 uppercase tracking-widest">المسافة</p>
              <p className="text-sm font-bold text-white font-mono">{dist.toLocaleString()} م</p>
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              <p className="text-[8px] text-amber-200/50 uppercase tracking-widest">السرعة</p>
              <p className="text-sm font-bold text-white font-mono">{Math.floor(gsRef.current.speed*20)} كم/س</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-4 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
              <p className="text-[8px] text-amber-200/50 uppercase tracking-widest">العلامة</p>
              <p className={`text-2xl font-extrabold font-mono ${passed?"text-emerald-300":totalSc<50?"text-red-300":"text-amber-300"}`}>{totalSc}<span className="text-xs text-white/30 font-normal">/{maxSc}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* شريط أسفل الشاشة */}
      {phase==="playing"&&(
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center px-4 gap-4 z-10">
          <div className="flex-1">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{width:`${prog}%`}}/>
            </div>
            <p className="text-[9px] text-white/30 mt-0.5">{prog.toFixed(0)}% — {dist.toLocaleString()} / {TARGET_DIST.toLocaleString()} م</p>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/40 shrink-0">
            {[["↑","تسارع"],["↓","فرملة"],["Space","طوارئ"],["←→","مسرب"],["Z","غماز↰"],["X","غماز↱"]].map(([k,l])=>(
              <div key={k} className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-white/50 text-[8px]">{k}</kbd><span>{l}</span></div>
            ))}
          </div>
          <button onClick={()=>{resetGame();phRef.current="idle";setPhase("idle");}} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-[10px] font-bold transition-all active:scale-95 shrink-0">إعادة</button>
        </div>
      )}

      {/* شاشة البدء */}
      {phase==="idle"&&(
        <div className="absolute inset-0 bg-black/75 backdrop-blur-lg flex items-center justify-center z-30">
          <div className="text-center px-8 max-w-xl">
            <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center">
              <span className="text-5xl">🇯🇴</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-1">فحص القيادة الأردني</h2>
            <p className="text-sm text-slate-400 mb-6">محاكاة واقعية لشوارع الأردن مع تقاطعات ذكية</p>
            <div className="grid grid-cols-4 gap-2 text-xs mb-6">
              {secData.map(s=>(
                <div key={s.sec} className="bg-white/8 rounded-xl p-2.5 border border-white/5">
                  <p className="font-bold text-white/80 text-[10px] leading-tight">{s.name}</p>
                  <p className="text-amber-300 font-bold mt-1 text-[11px]">{s.max} ع</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5 text-sm text-white/50 leading-8">
              <span className="text-amber-300 font-bold">↑↓</span> التسارع والفرملة &nbsp;·&nbsp;
              <span className="text-amber-300 font-bold">←→</span> تغيير المسرب &nbsp;·&nbsp;
              <span className="text-amber-300 font-bold">Space</span> فرملة طارئة<br/>
              <span className="text-amber-300 font-bold">Z</span> غماز يسار &nbsp;·&nbsp;
              <span className="text-amber-300 font-bold">X</span> غماز يمين &nbsp;·&nbsp;
              وصل <span className="text-amber-300 font-bold">15,000 متر</span> بعلامة عالية
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-white/30 mb-5">
              <span>🏘️ دكّانة أبو محمود</span>
              <span>🏫 مدرسة الصريح</span>
              <span>🏛️ دائرة السير</span>
              <span>🎓 جامعة اليرموك</span>
              <span>🕌 مسجد الحسن</span>
              <span>🥘 مطعم المنسف</span>
            </div>
            <button onClick={startGame} className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-base inline-flex items-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all">
              <span className="text-xl">▶</span> ابدأ الفحص
            </button>
          </div>
        </div>
      )}

      {/* شاشة النتيجة */}
      {phase==="finished"&&(
        <div className="absolute inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-30">
          <div className="text-center px-8 max-w-lg">
            <div className="text-7xl font-extrabold mb-2" style={{color:passed?"#34d399":"#f87171"}}>{totalSc}<span className="text-2xl text-white/30">/{maxSc}</span></div>
            <div className={`text-3xl font-bold mb-4 ${passed?"text-emerald-300":"text-red-300"}`}>
              {passed?"🏆 ناجح — مبارك!":"❌ راسب — حاول مجددًا"}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {secData.map(s=>{
                const p=s.max>0?s.scored/s.max*100:0;
                return(
                  <div key={s.sec} className={`rounded-xl p-2.5 text-center border ${p>=75?"bg-emerald-500/15 border-emerald-500/20":p>=50?"bg-amber-500/15 border-amber-500/20":"bg-red-500/15 border-red-500/20"}`}>
                    <p className="text-[9px] text-white/60 leading-tight">{s.name}</p>
                    <p className="font-bold text-white text-sm mt-0.5">{s.scored}<span className="text-white/30 text-[9px]">/{s.max}</span></p>
                  </div>
                );
              })}
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-5">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full"/>
              <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{left:"75%"}}/>
              <div className="absolute top-0 h-full w-2 bg-white rounded-full shadow-lg transition-all" style={{left:`${Math.min(totalSc,100)}%`,transform:"translateX(-50%)"}}/>
            </div>
            <p className="text-xs text-white/30 mb-5">المسافة المقطوعة: {dist.toLocaleString()} متر</p>
            <button onClick={startGame} className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-base inline-flex items-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all">
              <span className="text-xl">🔄</span> العب مجددًا
            </button>
          </div>
        </div>
      )}
    </div>
  );
}