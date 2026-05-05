"""
╔══════════════════════════════════════════════════════════════╗
║   DRIVING EVALUATION SYSTEM v5 — Front Camera               ║
║   YOLOv8 (train6) + Ultra-Fast Lane Detection               ║
║   10 معايير تقييم رسمية                                     ║
╚══════════════════════════════════════════════════════════════╝
Classes (train6):
  0=person  1=car  2=traffic_light  3=stop_sign
  4=no_entry  5=speed_limit  6=pedestrian_crossing  7=speed_bump
"""

from __future__ import annotations
import sys, time, warnings
from pathlib import Path
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict
from enum import Enum, auto

import cv2
import numpy as np
import torch
import torchvision.transforms as T

# ── NEW: import upgrades ──────────────────────────────────────
from upgrades import (
    SpeedEstimator, MiDaSDepth, SORTTracker,
    BehaviorWindow, MLRiskScorer, ReportGenerator,
    BehaviorPattern,
)




warnings.filterwarnings("ignore")

# ── UFLD import ──────────────────────────────────────────────
UFLD_ROOT = Path("Ultra-Fast-Lane-Detection-master")
sys.path.insert(0, str(UFLD_ROOT))
try:
    from model.model import parsingNet
    _UFLD_OK = True
except ImportError:
    _UFLD_OK = False

# ══════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════
@dataclass
class Config:
    YOLO_PATH:  str = (r"C:\Users\lenovo\Desktop\graduiation project"
                       r"\runs\detect\train6\weights\best.pt")
                       
    UFLD_PATH:  str = str(UFLD_ROOT / "tusimple_18.pth")
    VIDEO_PATH: str = "testing_vid.mp4"

    # class IDs
    CLS_PERSON:    int = 0
    CLS_CAR:       int = 1
    CLS_LIGHT:     int = 2
    CLS_STOP:      int = 3
    CLS_NO_ENTRY:  int = 4
    CLS_SPEED_LIM: int = 5
    CLS_PED_CROSS: int = 6
    CLS_BUMP:      int = 7

    # UFLD
    UFLD_GRID: int = 100
    UFLD_CLS:  int = 56
    UFLD_LANES:int = 4
    UFLD_W:    int = 800
    UFLD_H:    int = 288
    UFLD_ANCHORS: List[int] = field(default_factory=lambda: [
        64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,
        128,132,136,140,144,148,152,156,160,164,168,172,176,180,
        184,188,192,196,200,204,208,212,216,220,224,228,232,236,
        240,244,248,252,256,260,264,268,272,276,280,284,
    ])

    # thresholds
    SPEED_LIMIT:   float = 15.0
    SPEED_STOPPED: float = 1.5
    LANE_OK:       float = 0.20
    LANE_WARN:     float = 0.40
    JERK_OK:       float = 6.0
    JERK_HARSH:    float = 16.0

    # safety distance (pixels normalized to frame diagonal)
    SAFETY_DIST_OK:   float = 120.0   # normalized px — safe
    SAFETY_DIST_WARN: float = 60.0    # too close

    # bump: if speed_bump detected and speed > threshold → penalty
    BUMP_SPEED_MAX: float = 8.0

    # score buckets (must sum to 100)
    MAX_LANE:       int = 15
    MAX_LIGHT:      int = 15
    MAX_STOP:       int = 10
    MAX_SPEED:      int = 10
    MAX_SMOOTH:     int = 10
    MAX_SIGNS:      int = 10   # no_entry + speed_limit compliance
    MAX_SAFETY:     int = 10   # safe following distance
    MAX_PEDESTRIAN: int = 10   # pedestrian awareness
    MAX_BUMP:       int = 5    # bump handling
    MAX_INTERSECT:  int = 5    # intersection behaviour

    WIN:        str   = "Driving Evaluation v5"
    PANEL_A:    float = 0.82
    POPUP_SECS: float = 3.0


# أضف داخل class Config:
    SPEED_LIMIT_KMH:  float = 60.0    # km/h for ML scorer
    SAFE_DIST_M:      float = 20.0    # meters — safe following distance
    CAMERA_HEIGHT_M:  float = 1.2     # camera mounting height
    FOCAL_PX:         float = 700.0   # focal length in pixels
    SHOW_DEPTH_MAP:   bool  = False   # overlay depth colormap
    REPORT_PATH:      str   = "driving_report.pdf"
    GPS_SPEED_KMH:    Optional[float] = None  # set to float to override with GPS




CFG = Config()

# ══════════════════════════════════════════════════════════════
#  ENUMS & DATA CLASSES
# ══════════════════════════════════════════════════════════════
class RoadType(Enum):
    UNKNOWN = auto(); STRAIGHT = auto(); SLIGHT_CURVE = auto()
    CURVE_LEFT = auto(); CURVE_RIGHT = auto(); SHARP_TURN = auto()
    INTERSECTION = auto(); ROUNDABOUT = auto()

ROAD_LABEL = {
    RoadType.UNKNOWN:"Unknown", RoadType.STRAIGHT:"Straight",
    RoadType.SLIGHT_CURVE:"Slight Curve", RoadType.CURVE_LEFT:"Curve L",
    RoadType.CURVE_RIGHT:"Curve R", RoadType.SHARP_TURN:"Sharp Turn",
    RoadType.INTERSECTION:"Intersection", RoadType.ROUNDABOUT:"Roundabout",
}
ROAD_COLOR = {
    RoadType.UNKNOWN:(150,150,150), RoadType.STRAIGHT:(60,220,100),
    RoadType.SLIGHT_CURVE:(40,200,255), RoadType.CURVE_LEFT:(30,160,255),
    RoadType.CURVE_RIGHT:(30,160,255), RoadType.SHARP_TURN:(30,100,255),
    RoadType.INTERSECTION:(255,200,30), RoadType.ROUNDABOUT:(200,80,255),
}

@dataclass
class LaneResult:
    left_pts: Optional[np.ndarray] = None
    right_pts: Optional[np.ndarray] = None
    all_pts: List[np.ndarray] = field(default_factory=list)
    left_x_bot: Optional[int] = None
    right_x_bot: Optional[int] = None
    center_x: Optional[int] = None
    lane_width: Optional[int] = None
    curvature: float = 0.0
    direction: float = 0.0
    road_type: RoadType = RoadType.UNKNOWN

@dataclass
class Detection:
    """One YOLO detection."""
    cls: int
    conf: float
    x1: int; y1: int; x2: int; y2: int

    @property
    def cx(self): return (self.x1+self.x2)//2
    @property
    def cy(self): return (self.y1+self.y2)//2
    @property
    def area(self): return (self.x2-self.x1)*(self.y2-self.y1)
    @property
    def box(self): return (self.x1,self.y1,self.x2,self.y2)

@dataclass
class FrameState:
    dets: List[Detection] = field(default_factory=list)
    lane: LaneResult = field(default_factory=LaneResult)
    light_color: str = "unknown"
    speed_norm: float = 0.0
    jerk_norm: float = 0.0
    frame_w: int = 1280
    frame_h: int = 720
    frame_diag: float = 1.0

    def get(self, cls_id: int) -> Optional[Detection]:
        found = [d for d in self.dets if d.cls == cls_id]
        return max(found, key=lambda d: d.conf) if found else None

    def get_all(self, cls_id: int) -> List[Detection]:
        return [d for d in self.dets if d.cls == cls_id]

# ══════════════════════════════════════════════════════════════
#  LANE DETECTOR (same as v4, unchanged)
# ══════════════════════════════════════════════════════════════
class LaneDetector:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self._tf = T.Compose([
            T.ToPILImage(), T.Resize((CFG.UFLD_H, CFG.UFLD_W)),
            T.ToTensor(), T.Normalize((0.485,0.456,0.406),(0.229,0.224,0.225)),
        ])
        self._history: deque = deque(maxlen=8)
        self._load()

    def _load(self):
        if not _UFLD_OK:
            print("[!] UFLD not found → Hough fallback"); return
        wp = Path(CFG.UFLD_PATH)
        if not wp.exists():
            print(f"[!] UFLD weights missing → Hough fallback"); return
        try:
            net = parsingNet(pretrained=False, backbone="18",
                cls_dim=(CFG.UFLD_GRID+1, CFG.UFLD_CLS, CFG.UFLD_LANES),
                use_aux=False).to(self.device)
            ckpt = torch.load(str(wp), map_location=self.device)
            net.load_state_dict(ckpt.get("model", ckpt), strict=False)
            net.eval(); self.model = net
            print(f"[✓] UFLD ready on {self.device}")
        except Exception as e:
            print(f"[!] UFLD load failed: {e} → Hough fallback")

    def detect(self, frame: np.ndarray) -> LaneResult:
        res = self._ufld(frame) if self.model else self._hough(frame)
        res.road_type = self._classify(res)
        return res

    def _ufld(self, frame):
        h, w = frame.shape[:2]
        inp = self._tf(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(self.device)
        with torch.no_grad():
            out = self.model(inp)
        arr = out[0].data.cpu().numpy()[:, ::-1, :]
        col_x = np.linspace(0, CFG.UFLD_W-1, CFG.UFLD_GRID) / CFG.UFLD_W * w
        raw = []
        for li in range(CFG.UFLD_LANES):
            pts = []
            for ri in range(CFG.UFLD_CLS):
                cl = int(np.argmax(arr[:, ri, li]))
                if cl == CFG.UFLD_GRID: continue
                pts.append((int(col_x[cl]), int(CFG.UFLD_ANCHORS[ri]/CFG.UFLD_H*h)))
            raw.append(pts)
        return self._build(raw, w, h)

    def _hough(self, frame):
        h, w = frame.shape[:2]
        roi = frame[int(h*0.50):]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        edge = cv2.Canny(cv2.GaussianBlur(gray,(5,5),0), 50, 150)
        lines = cv2.HoughLinesP(edge, 1, np.pi/180, 50, minLineLength=60, maxLineGap=100)
        mid = w//2; lx=[]; rx=[]
        if lines is not None:
            for ln in lines:
                x1,y1,x2,y2 = ln[0]
                if abs(y2-y1)<15: continue
                cx=(x1+x2)//2
                (lx if cx<mid else rx).extend([x1,x2])
        lxv = int(np.mean(lx)) if lx else None
        rxv = int(np.mean(rx)) if rx else None
        raw = [[],[],[],[]]
        yb = int(h*0.50)
        if lxv: raw[0]=[(lxv-10,h),(lxv,yb)]
        if rxv: raw[1]=[(rxv+10,h),(rxv,yb)]
        return self._build(raw, w, h)

    @staticmethod
    def _build(raw_lanes, fw, fh):
        mid = fw//2
        valid = []
        for pts in raw_lanes:
            if len(pts) < 3: continue
            arr = np.array(pts, dtype=np.int32)
            xb = int(arr[arr[:,1].argmax(), 0])
            valid.append((abs(xb-mid), xb, arr))
        valid.sort(key=lambda t: t[0])
        lx=rx=lp=rp=None
        if len(valid)>=2:
            a,b = valid[0][1], valid[1][1]
            if a<b: lx,lp,rx,rp = a,valid[0][2],b,valid[1][2]
            else:   lx,lp,rx,rp = b,valid[1][2],a,valid[0][2]
        elif len(valid)==1:
            x=valid[0][1]
            if x<mid: lx,lp=x,valid[0][2]
            else:     rx,rp=x,valid[0][2]
        cx = (lx+rx)//2 if (lx and rx) else None
        ww = (rx-lx)    if (lx and rx) else None
        curv=dirn=0.0
        n=0
        for p in [lp,rp]:
            if p is None or len(p)<4: continue
            try:
                c = np.polyfit(p[:,1], p[:,0], 2)
                curv+=abs(c[0])*1e4; dirn+=c[0]; n+=1
            except: pass
        if n: curv/=n; dirn/=n
        return LaneResult(left_pts=lp, right_pts=rp,
            all_pts=[v[2] for v in valid],
            left_x_bot=lx, right_x_bot=rx,
            center_x=cx, lane_width=ww,
            curvature=curv, direction=dirn*1e4)

    def _classify(self, lane):
        self._history.append(lane.curvature)
        curv = float(np.mean(self._history))
        if lane.left_pts is None and lane.right_pts is None:
            return RoadType.INTERSECTION
        if lane.left_pts is None or lane.right_pts is None:
            if curv>0.35: return RoadType.ROUNDABOUT
            return RoadType.CURVE_LEFT if lane.direction<0 else RoadType.CURVE_RIGHT
        if curv<0.04:  return RoadType.STRAIGHT
        if curv<0.12:  return RoadType.SLIGHT_CURVE
        if curv<0.35:  return RoadType.CURVE_LEFT if lane.direction<0 else RoadType.CURVE_RIGHT
        if curv<0.70:  return RoadType.SHARP_TURN
        return RoadType.ROUNDABOUT

# ══════════════════════════════════════════════════════════════
#  TRAFFIC LIGHT ANALYZER
# ══════════════════════════════════════════════════════════════
class LightAnalyzer:
    @staticmethod
    def detect(roi: np.ndarray) -> Tuple[str, float]:
        if roi is None or roi.size==0: return "unknown", 0.0
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        total = roi.shape[0]*roi.shape[1]
        masks = {
            "red":   (cv2.inRange(hsv,(0,120,70),(10,255,255)) +
                      cv2.inRange(hsv,(170,120,70),(180,255,255))),
            "yellow": cv2.inRange(hsv,(15,100,100),(35,255,255)),
            "green":  cv2.inRange(hsv,(40,50,50),(90,255,255)),
        }
        counts = {c: cv2.countNonZero(m) for c,m in masks.items()}
        best = max(counts, key=counts.get)
        conf = counts[best]/max(1,total)
        return (best, round(conf,3)) if conf>0.025 else ("unknown", 0.0)

# ══════════════════════════════════════════════════════════════
#  SCORE BUCKET
# ══════════════════════════════════════════════════════════════


"""
class Bucket:
    def __init__(self, name, maximum):
        self.name=name; self.maximum=maximum
        self._val=0.0; self.good=0; self.miss=0
    def gain(self, pts): self._val=min(self.maximum, self._val+pts); self.good+=1
   # def mark_miss(self): self.miss+=1
"""

class Bucket:
    def __init__(self, name, maximum):
        self.name = name
        self.maximum = maximum
        self._val = maximum * 0.5
        self.miss = 0   # ✅ رجعناها

    def gain(self, pts):
        self._val = min(self.maximum, self._val + pts)

    def mark_miss(self, penalty=1.0):
        self._val = max(0, self._val - penalty)
        self.miss += 1

    def score(self):
        return round(self._val)

    def ratio(self):
        return self._val / self.maximum





#########
    def mark_miss(self, penalty=0.5):
        self._val = max(0, self._val - penalty)
        self.miss += 1
###########


    def score(self): return round(self._val)
    def ratio(self): return self._val/self.maximum

class EventKind(Enum):
    GOOD="good"; WARN="warn"; MISS="miss"

@dataclass
class Popup:
    kind: EventKind; label: str; pts: float
    ts: float = field(default_factory=time.time)

# ══════════════════════════════════════════════════════════════
#  DRIVING EVALUATOR — 10 معايير
# ══════════════════════════════════════════════════════════════
class DrivingEvaluator:
    def __init__(self):
        self.b = {
            "lane":      Bucket("Lane Keeping",          CFG.MAX_LANE),
            "light":     Bucket("Traffic Light",         CFG.MAX_LIGHT),
            "stop":      Bucket("Stop Sign",             CFG.MAX_STOP),
            "speed":     Bucket("Speed Control",         CFG.MAX_SPEED),
            "smooth":    Bucket("Smooth Driving",        CFG.MAX_SMOOTH),
            "signs":     Bucket("Sign Compliance",       CFG.MAX_SIGNS),
            "safety":    Bucket("Safety Distance",       CFG.MAX_SAFETY),
            "pedestrian":Bucket("Pedestrian Awareness",  CFG.MAX_PEDESTRIAN),
            "bump":      Bucket("Bump Handling",         CFG.MAX_BUMP),
            "intersect": Bucket("Intersection",          CFG.MAX_INTERSECT),
        }
        self.popups: deque = deque(maxlen=8)

        # state machines
        self._light_active = False
        self._light_locked = "unknown"
        self._stop_active = False
        self._stop_scored = False
        self._no_entry_warned = False
        self._bump_in_zone = False
        self._bump_scored = False
        self._in_intersection = False
        self._intersect_frames = 0

        # kinematics
        self._speeds: deque = deque(maxlen=20)
        self._accels: deque = deque(maxlen=10)

    def update(self, s: FrameState):
        self._kinematics(s)
        self._lane(s)
        self._speed(s)
        self._smooth(s)
        self._light(s)
        self._stop(s)
        self._signs(s)
        self._safety(s)
        self._pedestrian(s)
        self._bump(s)
        self._intersection(s)

    # ── 1. Lane Keeping ──────────────────────────────────────
    def _lane(self, s: FrameState):
        lane = s.lane
        if lane.center_x is None or lane.lane_width is None: return
        frame_cx = s.frame_w // 2
        offset = abs(frame_cx - lane.center_x)
        ratio = offset / max(1, lane.lane_width)
        if ratio <= CFG.LANE_OK:
            self.b["lane"].gain(0.5)
        elif ratio <= CFG.LANE_WARN:
            self._popup(EventKind.WARN, "⚠  Approaching Lane Edge", 0)
        else:
           #self.b["lane"].mark_miss()
            self.b["lane"].penalize(1.0)

            self._popup(EventKind.MISS, "✗  Lane Deviation", 0)

    # ── 2. Speed Control ─────────────────────────────────────
    def _speed(self, s: FrameState):
        if s.speed_norm <= 0: return
        if s.speed_norm <= CFG.SPEED_LIMIT:
            self.b["speed"].gain(0.02)

    # ── 3. Smooth Driving ────────────────────────────────────
    def _kinematics(self, s: FrameState):
        self._speeds.append(s.speed_norm)
        if len(self._speeds) >= 2:
            a = self._speeds[-1] - self._speeds[-2]
            self._accels.append(a)
        if len(self._accels) >= 2:
            s.jerk_norm = abs(self._accels[-1] - self._accels[-2])

    def _smooth(self, s: FrameState):
        if s.jerk_norm < CFG.JERK_OK:
            self.b["smooth"].gain(0.02)
        elif s.jerk_norm >= CFG.JERK_HARSH:
            self.b["smooth"].mark_miss()
            self._popup(EventKind.MISS, "✗  Harsh Maneuver", 0)

    # ── 4. Traffic Light ─────────────────────────────────────
    def _light(self, s: FrameState):
        light_det = s.get(CFG.CLS_LIGHT)
        if light_det is None:
            self._light_active = False; self._light_locked = "unknown"; return
        if not self._light_active:
            self._light_active = True
            self._light_locked = s.light_color
        color = self._light_locked
        if color == "green" and s.speed_norm > CFG.SPEED_STOPPED:
            self.b["light"].gain(5.0)
            self._popup(EventKind.GOOD, "✅  Green — Moving Correctly", 5)
            self._light_locked = "scored"
        elif color == "red" and s.speed_norm <= CFG.SPEED_STOPPED:
            self.b["light"].gain(5.0)
            self._popup(EventKind.GOOD, "✅  Red — Stopped Correctly", 5)
            self._light_locked = "scored"
        elif color == "yellow" and s.speed_norm < CFG.SPEED_LIMIT * 0.55:
            self.b["light"].gain(2.0)
            self._popup(EventKind.GOOD, "✅  Yellow — Slowing Down", 2)
            self._light_locked = "scored"

    # ── 5. Stop Sign ─────────────────────────────────────────
    def _stop(self, s: FrameState):
        stop_det = s.get(CFG.CLS_STOP)
        if stop_det is None:
            self._stop_active = False; self._stop_scored = False; return
        if not self._stop_active:
            self._stop_active = True; self._stop_scored = False
        if self._stop_scored: return
        x1,y1,x2,y2 = stop_det.box
        sign_h_ratio = (y2-y1) / s.frame_h
        if sign_h_ratio >= 0.12 and s.speed_norm <= CFG.SPEED_STOPPED:
            self.b["stop"].gain(5.0)
            self._popup(EventKind.GOOD, "✅  Stopped at Stop Sign", 5)
            self._stop_scored = True
        elif sign_h_ratio >= 0.20 and s.speed_norm > CFG.SPEED_LIMIT*0.5:
            self.b["stop"].mark_miss()
            self._popup(EventKind.MISS, "✗  Ran Stop Sign", 0)
            self._stop_scored = True

    # ── 6. Sign Compliance (no_entry + speed_limit) ──────────
    def _signs(self, s: FrameState):
        # No-entry: car is moving toward it = violation
        no_entry = s.get(CFG.CLS_NO_ENTRY)
        if no_entry is not None:
            x1,y1,x2,y2 = no_entry.box
            sign_h_ratio = (y2-y1)/s.frame_h
            if sign_h_ratio >= 0.10 and s.speed_norm > CFG.SPEED_STOPPED:
                if not self._no_entry_warned:
                    self.b["signs"].mark_miss()
                    self._popup(EventKind.MISS, "✗  Entering No-Entry Zone", 0)
                    self._no_entry_warned = True
            else:
                self._no_entry_warned = False
        else:
            self._no_entry_warned = False

        # Speed limit: continuous gain while within limit
        speed_sign = s.get(CFG.CLS_SPEED_LIM)
        if speed_sign is not None and s.speed_norm <= CFG.SPEED_LIMIT:
            self.b["signs"].gain(0.015)

    # ── 7. Safety Distance ───────────────────────────────────
    def _safety(self, s: FrameState):
        """
        Measure distance to nearest car in front.
        We normalize: bottom of car box ≈ close to us.
        Larger box area = closer. Use y2 proximity to frame bottom.
        """
        cars = s.get_all(CFG.CLS_CAR)
        if not cars:
            self.b["safety"].gain(0.02)  # no car ahead = safe
            return
        # find the car most directly ahead (closest to frame horizontal center
        # and with highest y2 = closest to us)
        frame_cx = s.frame_w // 2
        ahead = [c for c in cars if abs(c.cx - frame_cx) < s.frame_w * 0.3]
        if not ahead:
            self.b["safety"].gain(0.01)
            return
        nearest = max(ahead, key=lambda c: c.y2)
        # Distance proxy: normalize y2 from frame bottom
        # y2 near frame_h → very close; y2 near 0 → far
        dist_norm = (s.frame_h - nearest.y2) / s.frame_h * s.frame_diag
        if dist_norm >= CFG.SAFETY_DIST_OK:
            self.b["safety"].gain(0.02)
        elif dist_norm >= CFG.SAFETY_DIST_WARN:
            self._popup(EventKind.WARN, "⚠  Maintain Safe Distance", 0)
        else:
            self.b["safety"].mark_miss()
            self._popup(EventKind.MISS, "✗  Too Close to Vehicle Ahead", 0)

    # ── 8. Pedestrian Awareness ──────────────────────────────
    def _pedestrian(self, s: FrameState):
        """
        Person detected near pedestrian crossing OR in path → must slow down.
        """
        persons = s.get_all(CFG.CLS_PERSON)
        ped_cross = s.get(CFG.CLS_PED_CROSS)

        if not persons and not ped_cross:
            self.b["pedestrian"].gain(0.01)
            return

        # Person on crossing: check if car is slowing down
        if persons and ped_cross:
            if s.speed_norm <= CFG.SPEED_STOPPED * 2:
                self.b["pedestrian"].gain(0.08)
                self._popup(EventKind.GOOD, "✅  Yielded to Pedestrian", 1)
            elif s.speed_norm > CFG.SPEED_LIMIT * 0.5:
                self.b["pedestrian"].mark_miss()
                self._popup(EventKind.MISS, "✗  Failed to Yield to Pedestrian", 0)
        elif persons:
            # Person visible but no crossing sign — be cautious
            if s.speed_norm <= CFG.SPEED_LIMIT * 0.7:
                self.b["pedestrian"].gain(0.01)

    # ── 9. Bump Handling ─────────────────────────────────────
    def _bump(self, s: FrameState):
        bump_det = s.get(CFG.CLS_BUMP)
        if bump_det is None:
            self._bump_in_zone = False
            self._bump_scored = False
            return
        if not self._bump_in_zone:
            self._bump_in_zone = True
            self._bump_scored = False
        if self._bump_scored: return
        x1,y1,x2,y2 = bump_det.box
        bump_size = (y2-y1)/s.frame_h
        # Only score when bump is close (large in frame)
        if bump_size >= 0.08:
            if s.speed_norm <= CFG.BUMP_SPEED_MAX:
                self.b["bump"].gain(2.5)
                self._popup(EventKind.GOOD, "✅  Slowed for Speed Bump", 2)
            else:
                self.b["bump"].mark_miss()
                self._popup(EventKind.MISS, "✗  Crossed Bump Too Fast", 0)
            self._bump_scored = True

    # ── 10. Intersection Behaviour ───────────────────────────
    def _intersection(self, s: FrameState):
        if s.lane.road_type == RoadType.INTERSECTION:
            self._intersect_frames += 1
            if not self._in_intersection:
                self._in_intersection = True
                self._intersect_frames = 0
            # Score: slow down + controlled entry
            if s.speed_norm <= CFG.SPEED_LIMIT * 0.6:
                self.b["intersect"].gain(0.05)
                if self._intersect_frames == 10:
                    self._popup(EventKind.GOOD, "✅  Controlled Intersection Entry", 1)
        else:
            self._in_intersection = False
            self._intersect_frames = 0

    # ── helpers ──────────────────────────────────────────────
    def _popup(self, kind, label, pts):
        # De-duplicate: don't spam same event within 2s
        now = time.time()
        for p in self.popups:
            if p.label == label and now - p.ts < 2.0:
                return
        self.popups.append(Popup(kind, label, pts))

    def scores(self): return {k: v.score() for k,v in self.b.items()}
    def total(self): return sum(self.scores().values())
    def max_total(self): return sum(v.maximum for v in self.b.values())

# ══════════════════════════════════════════════════════════════
#  RENDERING
# ══════════════════════════════════════════════════════════════
_C = {
    "bg":(12,14,20), "panel":(18,20,30), "accent":(0,210,255),
    "text":(215,215,215), "good":(50,215,90),
    "warn":(30,175,255), "bad":(50,55,230),
}
_LANE_COLS = [(0,230,100),(0,155,255),(255,170,0),(200,0,240)]

def _score_col(ratio):
    if ratio>=0.70: return _C["good"]
    if ratio>=0.40: return _C["warn"]
    return _C["bad"]

def render_lanes(frame, lane: LaneResult):
    h, w = frame.shape[:2]
    if lane.left_pts is not None and lane.right_pts is not None:
        poly = np.vstack([lane.left_pts, lane.right_pts[::-1]]).astype(np.int32)
        ov = frame.copy()
        cv2.fillPoly(ov, [poly], (0,180,60))
        cv2.addWeighted(ov, 0.18, frame, 0.82, 0, frame)
    for i, pts in enumerate(lane.all_pts):
        for j in range(1,len(pts)):
            cv2.line(frame, tuple(pts[j-1]), tuple(pts[j]),
                     _LANE_COLS[i%len(_LANE_COLS)], 3, cv2.LINE_AA)
    if lane.left_x_bot:
        cv2.circle(frame, (lane.left_x_bot, h-15), 8, _C["warn"], -1)
    if lane.right_x_bot:
        cv2.circle(frame, (lane.right_x_bot, h-15), 8, _C["warn"], -1)
    if lane.center_x:
        cv2.line(frame, (lane.center_x, h), (lane.center_x, int(h*0.55)),
                 _C["accent"], 2, cv2.LINE_AA)
    fx = w//2
    cv2.line(frame, (fx,h-5),(fx,int(h*0.80)),(200,200,200),1,cv2.LINE_AA)
    label = ROAD_LABEL[lane.road_type]
    col   = ROAD_COLOR[lane.road_type]
    cv2.rectangle(frame,(w//2-90,int(h*0.08)-18),(w//2+190,int(h*0.08)+6),(20,20,30),-1)
    cv2.putText(frame, label, (w//2-90, int(h*0.08)),
                cv2.FONT_HERSHEY_DUPLEX, 0.58, col, 1, cv2.LINE_AA)

def render_hud(frame, evaluator: DrivingEvaluator, state: FrameState, fps: float):
    h, w = frame.shape[:2]
    scores = evaluator.scores()
    total  = evaluator.total()
    max_t  = evaluator.max_total()

    # Score panel (left)
    PW, PH = 310, 380
    panel = np.full((PH, PW, 3), _C["panel"], dtype=np.uint8)
    cv2.putText(panel, "DRIVE SCORE", (10,24),
                cv2.FONT_HERSHEY_DUPLEX, 0.60, _C["accent"], 1, cv2.LINE_AA)
    cv2.line(panel, (10,32),(PW-10,32), _C["accent"], 1)
    ORDER = ["lane","light","stop","speed","smooth",
             "signs","safety","pedestrian","bump","intersect"]
    NAMES = {
        "lane":"Lane Keeping","light":"Traffic Light","stop":"Stop Sign",
        "speed":"Speed Control","smooth":"Smooth Driving",
        "signs":"Sign Compliance","safety":"Safety Dist.",
        "pedestrian":"Pedestrians","bump":"Bump Handling",
        "intersect":"Intersection",
    }
    y = 50
    for key in ORDER:
        m=evaluator.b[key]; sc=m.score(); rat=m.ratio()
        bar=int(rat*185); col=_score_col(rat)
        cv2.putText(panel, NAMES[key], (10,y-3),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.36, _C["text"], 1, cv2.LINE_AA)
        cv2.rectangle(panel,(10,y+2),(195,y+12),(35,37,52),-1)
        cv2.rectangle(panel,(10,y+2),(10+bar,y+12),col,-1)
        cv2.putText(panel,f"{sc}/{m.maximum}",(200,y+11),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, col, 1, cv2.LINE_AA)
        y += 34
    cv2.line(panel,(10,y-4),(PW-10,y-4),_C["accent"],1)
    tot_col = _score_col(total/max_t)
    cv2.putText(panel,f"TOTAL  {total}/{max_t}",
                (10,y+18), cv2.FONT_HERSHEY_DUPLEX, 0.65, tot_col, 2, cv2.LINE_AA)

    roi = frame[8:8+PH, 8:8+PW]
    frame[8:8+PH, 8:8+PW] = cv2.addWeighted(roi,1-CFG.PANEL_A,panel,CFG.PANEL_A,0)

    # Event popups (right side)
    now = time.time()
    live = [p for p in evaluator.popups if now-p.ts < CFG.POPUP_SECS]
    py = 10
    for evt in reversed(live[-5:]):
        age = (now-evt.ts)/CFG.POPUP_SECS
        EW = 330
        if evt.kind==EventKind.GOOD: bg=(15,80,25); tc=_C["good"]
        elif evt.kind==EventKind.WARN: bg=(20,55,85); tc=_C["warn"]
        else: bg=(65,18,18); tc=(180,100,100)
        ep = np.full((34,EW,3),bg,dtype=np.uint8)
        pts_txt = f"  +{evt.pts:.0f}pt" if evt.pts>0 else ""
        cv2.putText(ep, evt.label+pts_txt,(8,22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.46, tc, 1, cv2.LINE_AA)
        ex = w-EW-10
        r2 = frame[py:py+34, ex:ex+EW]
        if r2.shape[:2]==ep.shape[:2]:
            frame[py:py+34, ex:ex+EW] = cv2.addWeighted(r2,age*0.3,ep,1-age*0.2,0)
        py += 38

    # Bottom strip
    SH=32
    strip=np.full((SH,w,3),_C["bg"],dtype=np.uint8)
    spd_col = _C["bad"] if state.speed_norm>CFG.SPEED_LIMIT else _C["good"]
    items = [
        (f"FPS {fps:.0f}", _C["accent"]),
        (f"Spd {state.speed_norm:.1f}/{CFG.SPEED_LIMIT}", spd_col),
        (f"Light:{state.light_color.upper()}", _C["accent"]),
        (f"LaneW:{state.lane.lane_width or '--'}px", _C["accent"]),
        (f"Road:{ROAD_LABEL[state.lane.road_type]}", ROAD_COLOR[state.lane.road_type]),
        (f"Score:{evaluator.total()}/{evaluator.max_total()}", tot_col),
    ]
    xs = w//len(items)
    for i,(txt,col) in enumerate(items):
        cv2.putText(strip,txt,(10+i*xs,21),
                    cv2.FONT_HERSHEY_SIMPLEX,0.38,col,1,cv2.LINE_AA)
    bk=frame[h-SH:h,:]
    frame[h-SH:h,:]=cv2.addWeighted(bk,0.25,strip,0.75,0)

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════



def main():
    from ultralytics import YOLO

    print("="*60)
    print("  DRIVING EVALUATION v5 UPGRADED — initializing …")
    print("="*60)

    # ── Core components ──────────────────────────────────────
    yolo   = YOLO(CFG.YOLO_PATH)
    lanes  = LaneDetector()
    light  = LightAnalyzer()
    eval_  = DrivingEvaluator()

    # ── NEW: Upgraded components ─────────────────────────────
    speed_est  = SpeedEstimator(
        fps=30.0,
        focal_px=CFG.FOCAL_PX,
        cam_height_m=CFG.CAMERA_HEIGHT_M,
    )
    depth_est  = MiDaSDepth(run_every_n=5)     # runs every 5th frame
    tracker    = SORTTracker(max_age=10, min_hits=3, iou_threshold=0.3)
    bwa        = BehaviorWindow(fps=30.0, window_sec=4.0)
    ml_scorer  = MLRiskScorer()
    reporter   = ReportGenerator()

    cap = cv2.VideoCapture(CFG.VIDEO_PATH)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open: {CFG.VIDEO_PATH}")

    fps_dq  = deque(maxlen=30)
    prev_t  = time.time()

    # State for ML scorer (running averages)
    ml_result        = {}
    behavior_result  = {}
    current_speed_kmh= 0.0
    current_dist_m   = 999.0

    # Track ID → speed history (for relative speed between vehicles)
    track_speed_hist: Dict[int, deque] = {}

    print("[✓] All systems ready. ESC to stop.\n")


    frame_count = 0
    last_res = None



    while True:
        ok, frame = cap.read()

      
        if not ok:
            break



        reporter.tick()
        fh, fw = frame.shape[:2]
        diag   = float(np.hypot(fw, fh))
        now    = time.time()
        dt     = max(now - prev_t, 1e-4)
        prev_t = now
        fps_dq.append(1.0 / dt)
        fps = float(np.mean(fps_dq))

        # ── YOLO detection ───────────────────────────────────
        res    = yolo(frame, verbose=False)


##################3
        res = yolo(frame, imgsz=640, conf=0.4, verbose=False)



###################



        state  = FrameState(frame_w=fw, frame_h=fh, frame_diag=diag)
        for box in res[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            state.dets.append(Detection(
                cls=int(box.cls[0]), conf=float(box.conf[0]),
                x1=x1, y1=y1, x2=x2, y2=y2,
            ))

        # ── SORT tracking ────────────────────────────────────
        # Build detection array for all vehicles (cars)
        car_dets = [
            [d.x1, d.y1, d.x2, d.y2, d.conf]
            for d in state.dets if d.cls == CFG.CLS_CAR
        ]
        if car_dets:
            det_arr = np.array(car_dets, dtype=np.float32)
        else:
            det_arr = np.empty((0, 5))

        tracks = tracker.update(det_arr)
        # tracks: [[x1,y1,x2,y2,track_id], ...]

        # Per-track speed (using centroid displacement)
        tracked_cars: Dict[int, Tuple] = {}
        for trk in tracks:
            x1, y1, x2, y2, tid = int(trk[0]), int(trk[1]), int(trk[2]), int(trk[3]), int(trk[4])
            cx = (x1 + x2) // 2
            if tid not in track_speed_hist:
                track_speed_hist[tid] = deque(maxlen=10)
            track_speed_hist[tid].append(cx)
            # Relative speed in px/frame
            if len(track_speed_hist[tid]) >= 2:
                rel_spd = abs(
                    track_speed_hist[tid][-1] - track_speed_hist[tid][-2]
                )
            else:
                rel_spd = 0.0
            tracked_cars[tid] = (x1, y1, x2, y2, rel_spd)

        # ── Speed estimation (optical flow or GPS) ───────────
        spd_result = speed_est.update(
            frame,
            gps_kmh=CFG.GPS_SPEED_KMH,   # None = use optical flow
        )
        current_speed_kmh = spd_result["speed_kmh"]
        # Also keep normalized version for backwards compat




        #state.speed_norm = current_speed_kmh / 3.6 * 10  # rough norm


######
        state.speed_norm = current_speed_kmh
######


        # ── Depth estimation ─────────────────────────────────
        # Measure distance to all tracked cars ahead
        car_boxes = [
            (int(trk[0]), int(trk[1]), int(trk[2]), int(trk[3]))
            for trk in tracks
        ]
        depth_result = depth_est.estimate(frame, roi_boxes=car_boxes)

        # Nearest vehicle ahead
        ahead_dists = []
        for i, (box, dist) in enumerate(
            zip(car_boxes, depth_result["distances_m"])
        ):
            # Only consider cars in the forward path
            x1, y1, x2, y2 = box
            cx = (x1+x2)//2
            if abs(cx - fw//2) < fw * 0.35:   # roughly in our lane
                ahead_dists.append(dist)
        current_dist_m = float(min(ahead_dists)) if ahead_dists else 999.0

        # ── Lane detection ────────────────────────────────────
        state.lane = lanes.detect(frame)

        # Lane deviation as 0..1 ratio
        if state.lane.center_x and state.lane.lane_width:
            offset = abs(fw//2 - state.lane.center_x)
            lane_dev = offset / max(1, state.lane.lane_width)
        else:
            lane_dev = 0.0

        # ── Traffic light ─────────────────────────────────────
        light_det = state.get(CFG.CLS_LIGHT)
        if light_det:
            x1, y1, x2, y2 = light_det.box
            roi = frame[max(0,y1):y2, max(0,x1):x2]
            state.light_color, _ = light.detect(roi)

        # ── Standard evaluator (bucket scores) ───────────────
        eval_.update(state)

        # ── Behavior window analysis ──────────────────────────
        light_ok = state.light_color in ("green", "unknown") or \
                   (state.light_color == "red" and
                    current_speed_kmh <= 2.0)
        sign_ok  = state.get(CFG.CLS_NO_ENTRY) is None   # simplification

        behavior_result = bwa.update(
            speed_kmh=current_speed_kmh,
            lane_dev=lane_dev,
            dist_m=current_dist_m,
            jerk=state.jerk_norm,
            light_ok=light_ok,
            sign_ok=sign_ok,
        )

        # ── ML risk scorer ────────────────────────────────────
        # Build compliance signals (0..1)
        lane_compliance   = max(0.0, 1.0 - lane_dev * 2)
        jerk_compliance   = max(0.0, 1.0 - state.jerk_norm / 20.0)
        smooth_compliance = jerk_compliance
        ped_ok   = 1.0 if not (state.get(CFG.CLS_PERSON) and
                               current_speed_kmh > 20) else 0.5
        bump_ok  = 1.0 if state.get(CFG.CLS_BUMP) is None else (
                   0.9 if current_speed_kmh <= 20 else 0.3)
        stop_ok  = 1.0
        inter_ok = 1.0
        if state.lane.road_type == RoadType.INTERSECTION:
            inter_ok = 0.9 if current_speed_kmh < CFG.SPEED_LIMIT * 0.6 else 0.5

        ml_result = ml_scorer.score(
            speed_kmh=current_speed_kmh,
            speed_limit_kmh=CFG.SPEED_LIMIT_KMH,
            dist_m=current_dist_m,
            safe_dist_m=CFG.SAFE_DIST_M,
            lane_dev=lane_dev,
            jerk=state.jerk_norm,
            light_ok=float(light_ok),
            sign_ok=float(sign_ok),
            ped_ok=ped_ok,
            bump_ok=bump_ok,
            stop_ok=stop_ok,
            intersection_ok=inter_ok,
            smooth=smooth_compliance,
        )

        # Log critical events to report
        if ml_result.get("risk_label") == "CRITICAL":
            reporter.log_event({
                "label": "CRITICAL risk detected",
                "kind":  "RISK",
                "speed": f"{current_speed_kmh:.1f} km/h",
                "dist":  f"{current_dist_m:.1f} m",
            })

        # ── Render ────────────────────────────────────────────
        vis = res[0].plot()

        # Optional: depth map overlay (bottom-right corner)
        if CFG.SHOW_DEPTH_MAP and depth_result["depth_vis"] is not None:
            dv = depth_result["depth_vis"]
            dv_small = cv2.resize(dv, (fw//4, fh//4))
            vis[fh - fh//4:, fw - fw//4:] = cv2.addWeighted(
                vis[fh-fh//4:, fw-fw//4:], 0.3, dv_small, 0.7, 0
            )

        # Draw tracked vehicle boxes with IDs + distances
        for i, (tid, (tx1, ty1, tx2, ty2, rel_spd)) in \
                enumerate(tracked_cars.items()):
            dist_m = depth_result["distances_m"][i] \
                if i < len(depth_result["distances_m"]) else 999.0
            color = (0, 255, 0) if dist_m >= CFG.SAFE_DIST_M else \
                    (0, 165, 255) if dist_m >= 10 else (0, 0, 255)
            cv2.rectangle(vis, (tx1,ty1), (tx2,ty2), color, 2)
            cv2.putText(vis, f"#{tid} {dist_m:.1f}m",
                        (tx1, ty1-6), cv2.FONT_HERSHEY_SIMPLEX,
                        0.40, color, 1, cv2.LINE_AA)

        render_lanes(vis, state.lane)
        render_hud_upgraded(vis, eval_, state, fps,
                            speed_result=spd_result,
                            ml_result=ml_result,
                            behavior_result=behavior_result,
                            dist_m=current_dist_m)

        cv2.imshow(CFG.WIN, vis)
        if cv2.waitKey(1) == 27:
            break

    cap.release()
    cv2.destroyAllWindows()

    # ── Save report ───────────────────────────────────────────
    bucket_export = {
        k: {"name": v.name, "score": v.score(),
            "maximum": v.maximum, "ratio": v.ratio()}
        for k, v in eval_.b.items()
    }
    reporter.save(
        CFG.REPORT_PATH,
        bucket_scores=bucket_export,
        ml_result=ml_result,
        behavior_summary=behavior_result,
        metadata={"video": CFG.VIDEO_PATH},
    )

    # Console final report (same as before, enhanced)
    total = eval_.total(); mx = eval_.max_total(); pct = total/mx*100
    q_score = ml_result.get("quality_score", 0)
    risk    = ml_result.get("risk_label", "N/A")
    dom_pat = behavior_result.get("dominant", "N/A")

    grade = ("EXCELLENT ⭐" if pct>=90 else "GOOD 👍" if pct>=75
             else "FAIR ⚠" if pct>=55 else "POOR ❌")

    print("\n" + "═"*62)
    print("          FINAL DRIVING EVALUATION — UPGRADED REPORT")
    print("═"*62)
    for key, bkt in eval_.b.items():
        sc  = bkt.score()
        bar = "█"*sc + "░"*(bkt.maximum-sc)
        print(f"  {bkt.name:<24} [{bar}]  {sc:2}/{bkt.maximum}")
    print("─"*62)
    print(f"  {'TOTAL (bucket)':<24}  {total}/{mx}  ({pct:.1f}%)")
    print(f"  {'AI Quality Score':<24}  {q_score}/100")
    print(f"  {'AI Risk Level':<24}  {risk}")
    print(f"  {'Dominant Pattern':<24}  {dom_pat}")
    print(f"\n  Grade: {grade}")
    print(f"  Report saved: {CFG.REPORT_PATH}")
    print("═"*62)


# ══════════════════════════════════════════════════════════════
#  UPGRADED HUD — adds speed (km/h), real distance, risk level
# ══════════════════════════════════════════════════════════════

def render_hud_upgraded(frame, evaluator, state, fps,
                        speed_result, ml_result, behavior_result, dist_m):
    """Extended HUD showing real speed, distance, ML risk score."""
    # Call the standard HUD first
    render_hud(frame, evaluator, state, fps)

    h, w = frame.shape[:2]
    _C_LOCAL = {
        "good": (50,215,90), "warn": (30,175,255),
        "bad":  (50,55,230), "accent": (0,210,255),
        "text": (215,215,215),
    }

    # ── Real speed badge (top center) ────────────────────────
    speed_kmh = speed_result.get("speed_kmh", 0.0)
    src       = speed_result.get("source", "?")[0].upper()  # G/F/U
    spd_col   = _C_LOCAL["bad"]   if speed_kmh > CFG.SPEED_LIMIT_KMH else \
                _C_LOCAL["warn"]  if speed_kmh > CFG.SPEED_LIMIT_KMH*0.9 else \
                _C_LOCAL["good"]

    badge_x = w//2 - 60
    badge_y = int(h * 0.15)
    cv2.rectangle(frame, (badge_x,badge_y-22), (badge_x+120,badge_y+6),
                  (20,20,30), -1)
    cv2.putText(frame, f"{speed_kmh:.0f} km/h [{src}]",
                (badge_x+4, badge_y),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, spd_col, 1, cv2.LINE_AA)

    # ── Distance badge ────────────────────────────────────────
    dist_col = _C_LOCAL["bad"]  if dist_m < 8.0  else \
               _C_LOCAL["warn"] if dist_m < 20.0 else \
               _C_LOCAL["good"]
    dist_txt = f"Dist: {dist_m:.1f}m" if dist_m < 500 else "Dist: --"

    cv2.rectangle(frame, (badge_x, badge_y+10), (badge_x+120, badge_y+32),
                  (20,20,30), -1)
    cv2.putText(frame, dist_txt, (badge_x+4, badge_y+28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, dist_col, 1, cv2.LINE_AA)

    # ── Risk level badge (top right) ─────────────────────────
    risk_label = ml_result.get("risk_label", "N/A")
    q_score    = ml_result.get("quality_score", 0)
    risk_colors = {
        "LOW":      (50,215,90),   "MEDIUM": (30,175,255),
        "HIGH":     (50,55,230),   "CRITICAL":(0,0,255),
        "N/A":      (150,150,150),
    }
    rc = risk_colors.get(risk_label, (150,150,150))
    rx = w - 200
    cv2.rectangle(frame, (rx, 8), (rx+190, 56), (20,20,30), -1)
    cv2.putText(frame, f"Risk: {risk_label}",
                (rx+6, 28), cv2.FONT_HERSHEY_DUPLEX, 0.52, rc, 1, cv2.LINE_AA)
    cv2.putText(frame, f"Quality: {q_score:.0f}/100",
                (rx+6, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.42, _C_LOCAL["text"],
                1, cv2.LINE_AA)

    # ── Behavior pattern badge ────────────────────────────────
    pattern = behavior_result.get("pattern", "")
    if pattern and pattern not in ("insufficient_data", "normal"):
        pat_col = _C_LOCAL["bad"] if pattern == BehaviorPattern.AGGRESSIVE \
                  else _C_LOCAL["warn"]
        py = int(h*0.22)
        cv2.rectangle(frame, (w//2-90, py-20), (w//2+90, py+4), (30,18,18), -1)
        cv2.putText(frame, f"Pattern: {pattern.replace('_',' ').upper()}",
                    (w//2-86, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, pat_col, 1, cv2.LINE_AA)
if __name__=="__main__":
    main()