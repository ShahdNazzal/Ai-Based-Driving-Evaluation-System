"""
AI Driving Exam System v2 — نظام تقييم القيادة
================================================
الإصلاحات:
  • tracked_cars قيم int صحيحة دائماً
  • لا false positives للأشخاص والإشارات
  • نقاط تزيد وتنقص بتوازن حقيقي
  • سريع على CPU (فيديو 15 دقيقة)
  • لا أخطاء OpenCV
"""
from __future__ import annotations
import sys, os, time, warnings, asyncio
from pathlib import Path
from collections import deque, Counter
from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict, Any

import gc
import cv2
import numpy as np
import torch
import torchvision.transforms as T
import gradio as gr
from ultralytics import YOLO

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
warnings.filterwarnings("ignore")

UFLD_ROOT = Path("Ultra-Fast-Lane-Detection-master")
sys.path.insert(0, str(UFLD_ROOT))
try:
    from model.model import parsingNet
    _UFLD_OK = True
except ImportError:
    _UFLD_OK = False


# ═══════════════════════════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════════════════════════
@dataclass
class Config:
    YOLO_TRAFFIC_PATH: str = "yolov8n.pt"
    YOLO_SIGNS_PATH:   str = "best.pt"
    UFLD_PATH:         str = "best_lane.pt"

    # COCO class IDs
    CLS_PERSON: int = 0
    CLS_CAR:    int = 2
    CLS_BUS:    int = 5
    CLS_TRUCK:  int = 7
    CLS_MBIKE:  int = 3
    CLS_LIGHT:  int = 9
    CLS_STOP:   int = 11

    # Custom signs
    CLS_CROSSWALK:  int = 0
    CLS_SPEED_BUMP: int = 1
    CLS_NO_ENTRY:   int = 2

    # UFLD
    UFLD_GRID: int = 100
    UFLD_CLS:  int = 56
    UFLD_LANES: int = 4
    UFLD_W:    int = 800
    UFLD_H:    int = 288
    UFLD_ANCHORS: List[int] = field(default_factory=lambda: [
        64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,
        144,148,152,156,160,164,168,172,176,180,184,188,192,196,200,204,208,212,
        216,220,224,228,232,236,240,244,248,252,256,260,264,268,272,276,280,284,
    ])

    # Physics
    HORIZON_RATIO:   float = 0.35
    DIST_CALIB_K:    float = 5500.0
    SPEED_LIMIT_KMH: float = 60.0
    SPEED_STOPPED:   float = 3.0
    BUMP_SPEED_MAX:  float = 20.0
    SAFE_DIST_M:     float = 20.0
    WARN_DIST_M:     float = 10.0
    CRITICAL_DIST_M: float = 5.0

    # Person filters (strict)
    PERSON_CONF_MIN:         float = 0.65
    PERSON_ASPECT_MIN:       float = 1.4
    PERSON_HEIGHT_MIN_RATIO: float = 0.10
    PERSON_Y_MIN_RATIO:      float = 0.35

    # Stop sign filters
    STOP_CONF_MIN:       float = 0.55
    STOP_AREA_MIN_RATIO: float = 0.003
    STOP_RED_MIN:        float = 0.28

    PANEL_ALPHA: float = 0.78
    MAX_FRAMES:  int   = 54000

    SCORE_START: float = 0.75
    SCORE_CEIL:  float = 0.95


CFG = Config()

EXAM_CRITERIA = [
    ("surroundings",     "الظروف المحيطة",             "Surroundings",      3),
    ("positioning",      "التموضع",                    "Positioning",       4),
    ("lane_keeping",     "الحفاظ على المسرب",          "Lane Keeping",      4),
    ("turning",          "الدوران",                    "Turning",           4),
    ("sign_awareness",   "إشارات الطريق",              "Sign Awareness",    4),
    ("traffic_aware",    "حركة المرور",                "Traffic Awareness", 4),
    ("ground_marks",     "العلامات الأرضية",           "Ground Marks",      4),
    ("intersections",    "المقاطعات",                  "Intersections",     4),
    ("normal_stop",      "الوقوف الطبيعي",             "Normal Stop",       2),
    ("sudden_stop",      "الوقوف المفاجئ",             "Sudden Stop",       3),
    ("intersect_safety", "مسافة أمان التقاطع",         "Intersect Safety",  3),
    ("stop_compliance",  "الالتزام بإشارات الوقوف",   "Stop Compliance",   2),
    ("pedestrians",      "التعامل مع المشاة",          "Pedestrians",       4),
    ("vehicles",         "التعامل مع المركبات",        "Vehicles",          4),
    ("road_env",         "بيئة الطريق والسرعة",        "Road Env",          4),
    ("obstacles",        "التعامل مع العوائق",         "Obstacles",         3),
]
TOTAL_MARKS = sum(c[3] for c in EXAM_CRITERIA)  # 56


# ═══════════════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════════════
from enum import Enum, auto

class RoadType(Enum):
    UNKNOWN     = auto()
    STRAIGHT    = auto()
    SLIGHT_CURVE = auto()
    CURVE_LEFT  = auto()
    CURVE_RIGHT = auto()
    SHARP_TURN  = auto()
    INTERSECTION = auto()
    ROUNDABOUT  = auto()

ROAD_LABELS = {r: r.name.replace("_", " ") for r in RoadType}
ROAD_COLORS = {
    RoadType.UNKNOWN:      (150, 150, 150),
    RoadType.STRAIGHT:     (60,  220, 100),
    RoadType.SLIGHT_CURVE: (40,  200, 255),
    RoadType.CURVE_LEFT:   (30,  160, 255),
    RoadType.CURVE_RIGHT:  (30,  160, 255),
    RoadType.SHARP_TURN:   (30,  100, 255),
    RoadType.INTERSECTION: (255, 200,  30),
    RoadType.ROUNDABOUT:   (200,  80, 255),
}

class EventKind(Enum):
    GOOD = "good"
    WARN = "warn"
    MISS = "miss"


# ═══════════════════════════════════════════════════════════════
#  DATACLASSES
# ═══════════════════════════════════════════════════════════════
@dataclass
class LaneResult:
    left_pts:    Optional[np.ndarray] = None
    right_pts:   Optional[np.ndarray] = None
    all_pts:     List[np.ndarray]     = field(default_factory=list)
    left_x_bot:  Optional[int]        = None
    right_x_bot: Optional[int]        = None
    center_x:    Optional[int]        = None
    lane_width:  Optional[int]        = None
    curvature:   float     = 0.0
    direction:   float     = 0.0
    road_type:   RoadType  = RoadType.UNKNOWN
    confidence:  float     = 0.0


@dataclass
class Detection:
    cls:  int
    conf: float
    x1:   int
    y1:   int
    x2:   int
    y2:   int
    source: str = "traffic"

    @property
    def cx(self) -> int: return (self.x1 + self.x2) // 2
    @property
    def cy(self) -> int: return (self.y1 + self.y2) // 2
    @property
    def h(self)  -> int: return max(1, self.y2 - self.y1)
    @property
    def w(self)  -> int: return max(1, self.x2 - self.x1)
    @property
    def box(self) -> Tuple[int,int,int,int]: return (self.x1, self.y1, self.x2, self.y2)


@dataclass
class FrameState:
    dets:               List[Detection] = field(default_factory=list)
    lane:               LaneResult      = field(default_factory=LaneResult)
    light_color:        str   = "unknown"
    speed_kmh:          float = 0.0
    jerk_ms2:           float = 0.0
    frame_w:            int   = 1280
    frame_h:            int   = 720
    dist_to_ahead:      float = 999.0
    is_intersection:    bool  = False
    detected_stop_sign: bool  = False

    def get(self, cls_id: int, src: str = "traffic") -> Optional[Detection]:
        found = [d for d in self.dets if d.cls == cls_id and d.source == src]
        return max(found, key=lambda d: d.conf) if found else None

    def get_all(self, cls_id: int, src: str = "traffic") -> List[Detection]:
        return [d for d in self.dets if d.cls == cls_id and d.source == src]

    def get_crosswalk(self)  -> Optional[Detection]: return self.get(CFG.CLS_CROSSWALK,  "signs")
    def get_speed_bump(self) -> Optional[Detection]: return self.get(CFG.CLS_SPEED_BUMP, "signs")
    def get_no_entry(self)   -> Optional[Detection]: return self.get(CFG.CLS_NO_ENTRY,   "signs")


@dataclass
class ViolationEvent:
    frame:     int
    reason_en: str
    reason_ar: str
    deduction: float
    ts:        float = field(default_factory=time.time)


# ═══════════════════════════════════════════════════════════════
#  OBJECT VALIDATION
# ═══════════════════════════════════════════════════════════════

def _red_ratio(frame: np.ndarray, det: Detection) -> float:
    y1 = max(0, det.y1); y2 = max(1, det.y2)
    x1 = max(0, det.x1); x2 = max(1, det.x2)
    roi = frame[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    m1  = cv2.inRange(hsv, (0,   100, 70), (10,  255, 255))
    m2  = cv2.inRange(hsv, (160, 100, 70), (180, 255, 255))
    return (cv2.countNonZero(m1) + cv2.countNonZero(m2)) / max(1, roi.shape[0] * roi.shape[1])


def is_valid_stop_sign(frame: np.ndarray, det: Detection) -> bool:
    if det.conf < CFG.STOP_CONF_MIN:
        return False
    fh, fw = frame.shape[:2]
    area_r = (det.h * det.w) / max(1, fh * fw)
    if area_r < CFG.STOP_AREA_MIN_RATIO:
        return False
    if _red_ratio(frame, det) < CFG.STOP_RED_MIN:
        return False
    # شكل قريب من المربع (مثمن)
    aspect = det.w / max(1, det.h)
    if not (0.5 <= aspect <= 2.0):
        return False
    return True


def is_valid_person(det: Detection, fh: int = 720, fw: int = 1280) -> bool:
    if det.conf < CFG.PERSON_CONF_MIN:
        return False
    aspect = det.h / max(1, det.w)
    if aspect < CFG.PERSON_ASPECT_MIN:
        return False
    if det.h < fh * CFG.PERSON_HEIGHT_MIN_RATIO:
        return False
    if det.y2 < fh * CFG.PERSON_Y_MIN_RATIO:
        return False
    if det.y1 < fh * 0.15 and (det.x1 < fw * 0.05 or det.x2 > fw * 0.95):
        return False
    return True


def is_valid_vehicle(det: Detection, fh: int) -> bool:
    return det.conf >= 0.40 and det.h >= fh * 0.04


# ═══════════════════════════════════════════════════════════════
#  SCORE BUCKET — نقاط تزيد وتنقص بتوازن
# ═══════════════════════════════════════════════════════════════
class ScoreBucket:
    _DRIFT   = 0.0025
    _CEIL    = 0.95
    _FLOOR   = 0.00

    def __init__(self, max_marks: int):
        self.max_marks = max_marks
        start = max_marks * CFG.SCORE_START
        self._val    = start
        self._target = start
        self.violations: List[ViolationEvent] = []
        self._last: Dict[str, int] = {}

    def _clamp(self):
        lo = self.max_marks * self._FLOOR
        hi = self.max_marks * self._CEIL
        self._val    = max(lo, min(hi, self._val))
        self._target = max(lo, min(hi, self._target))

    def _drift(self):
        self._val += self._DRIFT * (self._target - self._val)
        self._clamp()

    def reward(self, amount: float = 0.0):
        if amount <= 0:
            amount = 0.004 * self.max_marks
        hi = self.max_marks * self._CEIL
        self._target = min(hi, self._target + amount)
        self._val = min(hi, self._val + amount * 0.25)   # ←← أضف هذا السطر

        self._drift()

    def tick(self):
        self._drift()

    def penalize(self, amount: float, en: str, ar: str,
                 frame: int = 0, vkey: str = "", cooldown: int = 45):
        vk = vkey or en
        if vk in self._last and (frame - self._last[vk]) < cooldown:
            return
        self._last[vk] = frame
        lo = self.max_marks * self._FLOOR
        self._target = max(lo, self._target - amount)
        self._val    = max(lo, self._val - amount * 0.25)
        if amount > 0.01:
            self.violations.append(ViolationEvent(frame, en, ar, amount))
        self._drift()

    @property
    def score(self) -> int:
        return max(0, round(self._val))

    @property
    def ratio(self) -> float:
        return float(self._val) / max(1.0, float(self.max_marks))


# ═══════════════════════════════════════════════════════════════
#  PHYSICS
# ═══════════════════════════════════════════════════════════════
class KalmanSpeed:
    def __init__(self, q: float = 0.08, r: float = 4.0):
        self.q = q; self.r = r; self.x = 0.0; self.p = 50.0

    def update(self, z: float) -> float:
        self.p += self.q
        k       = self.p / (self.p + self.r)
        self.x += k * (z - self.x)
        self.p *= (1.0 - k)
        return self.x


class PhysicsEstimator:
    def __init__(self, fps: float = 30.0):
        self.fps  = fps
        self.K    = CFG.DIST_CALIB_K
        self.hor  = CFG.HORIZON_RATIO
        self._lk  = dict(winSize=(21, 21), maxLevel=3,
                         criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
        self._feat = dict(maxCorners=100, qualityLevel=0.01, minDistance=8, blockSize=7)
        self._prev_gray = None
        self._prev_pts  = None
        self._refresh   = 0
        self.kal        = KalmanSpeed()

    def dist_from_y(self, y_px: int, fh: int) -> float:
        denom = float(y_px) - float(fh) * self.hor
        if denom <= 4.0:
            return 200.0
        return min(float(self.K) / denom, 200.0)

    def dist_to_det(self, det: Detection, fh: int) -> float:
        return self.dist_from_y(det.y2, fh)

    def estimate_speed(self, frame: np.ndarray) -> float:
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w  = gray.shape
        y_hor = int(h * self.hor)
        roi   = gray[y_hor:, w // 4:3 * w // 4]

        self._refresh += 1
        need = (self._prev_pts is None
                or self._refresh >= 12
                or len(self._prev_pts) < 10)
        if need:
            pts = cv2.goodFeaturesToTrack(roi, **self._feat)
            if pts is None:
                self._prev_gray = gray
                return self.kal.x
            pts[:, 0, 0] += w // 4
            pts[:, 0, 1] += y_hor
            self._prev_pts  = pts
            self._refresh   = 0

        if self._prev_gray is None:
            self._prev_gray = gray
            return self.kal.x

        curr, status, _ = cv2.calcOpticalFlowPyrLK(
            self._prev_gray, gray, self._prev_pts, None, **self._lk)
        good = (status == 1).flatten()
        if good.sum() < 5:
            self._prev_gray = gray
            self._prev_pts  = None
            return self.kal.x

        pg, cg = self._prev_pts[good], curr[good]
        speeds = []
        for i in range(len(pg)):
            y1f = float(pg[i, 0, 1])
            y2f = float(cg[i, 0, 1])
            if y2f > y1f and y1f > y_hor + 10:
                d1 = self.dist_from_y(int(y1f), h)
                d2 = self.dist_from_y(int(y2f), h)
                dd = d1 - d2
                if 0.0 < dd < 6.0:
                    speeds.append(dd * self.fps * 3.6)

        self._prev_gray = gray
        self._prev_pts  = cg
        raw = 0.0
        if len(speeds) >= 3:
            sp = np.array(speeds, dtype=np.float32)
            q1, q3 = np.percentile(sp, [25, 75])
            iqr = q3 - q1
            inn = sp[(sp >= q1 - 1.5 * iqr) & (sp <= q3 + 1.5 * iqr)]
            if len(inn) >= 2:
                raw = float(np.median(inn))
        return self.kal.update(raw)


# ═══════════════════════════════════════════════════════════════
#  LANE DETECTOR
# ═══════════════════════════════════════════════════════════════
class LaneDetector:
    def __init__(self):
        self.device = torch.device("cpu")
        self.model  = None
        self._tf    = T.Compose([
            T.ToPILImage(),
            T.Resize((CFG.UFLD_H, CFG.UFLD_W)),
            T.ToTensor(),
            T.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
        ])
        self._hist: deque = deque(maxlen=10)
        self._load()

    def _load(self):
        if not _UFLD_OK:
            return
        p = Path(CFG.UFLD_PATH)
        if not p.exists():
            return
        try:
            net = parsingNet(
                pretrained=False, backbone="18",
                cls_dim=(CFG.UFLD_GRID + 1, CFG.UFLD_CLS, CFG.UFLD_LANES),
                use_aux=False,
            ).to(self.device)
            ck = torch.load(str(p), map_location=self.device, weights_only=False)
            net.load_state_dict(ck.get("model", ck), strict=False)
            net.eval()
            self.model = net
        except Exception:
            pass

    def detect(self, frame: np.ndarray) -> LaneResult:
        if self.model:
            return self._ufld(frame)
        return self._hough(frame)

    def _ufld(self, frame: np.ndarray) -> LaneResult:
        h, w = frame.shape[:2]
        rgb  = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        inp  = self._tf(rgb).unsqueeze(0).to(self.device)
        with torch.no_grad():
            out = self.model(inp)
        arr = out[0].data.cpu().numpy()[:, ::-1, :]
        cx  = np.linspace(0, CFG.UFLD_W - 1, CFG.UFLD_GRID) / CFG.UFLD_W * w
        raw = []
        for li in range(CFG.UFLD_LANES):
            pts = []
            for ri in range(CFG.UFLD_CLS):
                ci = int(np.argmax(arr[:, ri, li]))
                if ci == CFG.UFLD_GRID:
                    continue
                pts.append((int(cx[ci]), int(CFG.UFLD_ANCHORS[ri] / CFG.UFLD_H * h)))
            raw.append(pts)
        r = self._build(raw, w, h)
        r.confidence = 0.90 if len(r.all_pts) >= 2 else 0.50
        return r

    def _hough(self, frame: np.ndarray) -> LaneResult:
        h, w  = frame.shape[:2]
        roi   = frame[int(h * 0.50):]
        gray  = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        blur  = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 50,
                                minLineLength=60, maxLineGap=100)
        mx   = w // 2
        lx, rx = [], []
        if lines is not None:
            for ln in lines:
                x1_, y1_, x2_, y2_ = ln[0]
                if abs(y2_ - y1_) < 15:
                    continue
                c = (x1_ + x2_) // 2
                if c < mx:
                    lx.extend([x1_, x2_])
                else:
                    rx.extend([x1_, x2_])
        yb  = int(h * 0.50)
        raw = [[], [], [], []]
        if lx:
            raw[0] = [(int(np.mean(lx)) - 10, h), (int(np.mean(lx)), yb)]
        if rx:
            raw[1] = [(int(np.mean(rx)) + 10, h), (int(np.mean(rx)), yb)]
        r = self._build(raw, w, h)
        r.confidence = 0.40
        return r

    @staticmethod
    def _build(raw: List[List], fw: int, fh: int) -> LaneResult:
        mx    = fw // 2
        valid = []
        for pts in raw:
            if len(pts) < 3:
                continue
            a  = np.array(pts, dtype=np.int32)
            bx = int(a[a[:, 1].argmax(), 0])
            valid.append((abs(bx - mx), bx, a))
        valid.sort(key=lambda t: t[0])
        lx = rx = lp = rp = None
        if len(valid) >= 2:
            a, b = valid[0][1], valid[1][1]
            if a < b:
                lx, lp, rx, rp = a, valid[0][2], b, valid[1][2]
            else:
                lx, lp, rx, rp = b, valid[1][2], a, valid[0][2]
        elif len(valid) == 1:
            x = valid[0][1]
            if x < mx:
                lx, lp = x, valid[0][2]
            else:
                rx, rp = x, valid[0][2]
        cx = (lx + rx) // 2 if (lx is not None and rx is not None) else None
        lw = (rx - lx)      if (lx is not None and rx is not None) else None
        cur = dir_ = 0.0
        n = 0
        for pts in [lp, rp]:
            if pts is None or len(pts) < 4:
                continue
            try:
                c    = np.polyfit(pts[:, 1], pts[:, 0], 2)
                cur  += abs(c[0]) * 1e4
                dir_ += c[0]
                n    += 1
            except Exception:
                pass
        if n:
            cur  /= n
            dir_ /= n
        return LaneResult(
            left_pts=lp, right_pts=rp,
            all_pts=[v[2] for v in valid],
            left_x_bot=lx, right_x_bot=rx,
            center_x=cx, lane_width=lw,
            curvature=cur, direction=dir_ * 1e4,
        )

    def classify_road(self, lane: LaneResult) -> RoadType:
        self._hist.append(lane.curvature)
        avg = float(np.mean(self._hist))
        if lane.left_pts is None and lane.right_pts is None:
            return RoadType.INTERSECTION
        if lane.left_pts is None or lane.right_pts is None:
            return RoadType.ROUNDABOUT if avg > 0.35 else (
                RoadType.CURVE_LEFT if lane.direction < 0 else RoadType.CURVE_RIGHT)
        if avg < 0.04:   return RoadType.STRAIGHT
        if avg < 0.12:   return RoadType.SLIGHT_CURVE
        if avg < 0.35:   return RoadType.CURVE_LEFT if lane.direction < 0 else RoadType.CURVE_RIGHT
        if avg < 0.70:   return RoadType.SHARP_TURN
        return RoadType.ROUNDABOUT


# ═══════════════════════════════════════════════════════════════
#  TRAFFIC LIGHT
# ═══════════════════════════════════════════════════════════════
class TrafficLightAnalyzer:
    @staticmethod
    def analyze(roi: np.ndarray) -> Tuple[str, float]:
        if roi is None or roi.size == 0:
            return "unknown", 0.0
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        tot = roi.shape[0] * roi.shape[1]
        masks = {
            "red":    (cv2.inRange(hsv, (0,   120, 70), (10,  255, 255)) +
                       cv2.inRange(hsv, (170, 120, 70), (180, 255, 255))),
            "yellow": cv2.inRange(hsv, (15, 100, 100), (35,  255, 255)),
            "green":  cv2.inRange(hsv, (40,  50,  50), (90,  255, 255)),
        }
        cnt  = {c: cv2.countNonZero(m) for c, m in masks.items()}
        best = max(cnt, key=cnt.get)
        conf = cnt[best] / max(1, tot)
        return (best, round(conf, 3)) if conf > 0.025 else ("unknown", 0.0)


# ═══════════════════════════════════════════════════════════════
#  SIMPLE IoU TRACKER — بدون filterpy
# ═══════════════════════════════════════════════════════════════
class SimpleTracker:
    def __init__(self, max_age: int = 6, iou_th: float = 0.25):
        self.max_age  = max_age
        self.iou_th   = iou_th
        self._next_id = 0
        # {id: {"box": [x1,y1,x2,y2], "age": int}}
        self._tracks: Dict[int, dict] = {}

    @staticmethod
    def _iou(a: list, b: list) -> float:
        xx1 = max(a[0], b[0]); yy1 = max(a[1], b[1])
        xx2 = min(a[2], b[2]); yy2 = min(a[3], b[3])
        inter = max(0, xx2 - xx1) * max(0, yy2 - yy1)
        aa = (a[2] - a[0]) * (a[3] - a[1])
        ab = (b[2] - b[0]) * (b[3] - b[1])
        return inter / max(float(aa + ab - inter), 1e-6)

    def update(self, dets: np.ndarray) -> Dict[int, Tuple[int, int, int, int]]:
        """
        dets: numpy array شكله (N, 4)  — [x1, y1, x2, y2] integers أو floats
        يُعيد: dict  {track_id: (x1, y1, x2, y2)}  — جميع القيم int صحيحة
        """
        # تقدير عمر المسارات
        for tid in list(self._tracks.keys()):
            self._tracks[tid]["age"] += 1
            if self._tracks[tid]["age"] > self.max_age:
                del self._tracks[tid]

        # تحويل dets لقائمة Python عادية
        if len(dets) == 0:
            det_list = []
        else:
            det_list = [[int(d[0]), int(d[1]), int(d[2]), int(d[3])] for d in dets]

        matched_ids: set = set()

        for det_box in det_list:
            best_iou = self.iou_th
            best_tid = None
            for tid, trk in self._tracks.items():
                if tid in matched_ids:
                    continue
                iou = self._iou(det_box, trk["box"])
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid
            if best_tid is not None:
                self._tracks[best_tid]["box"] = det_box
                self._tracks[best_tid]["age"] = 0
                matched_ids.add(best_tid)
            else:
                self._tracks[self._next_id] = {"box": det_box, "age": 0}
                self._next_id += 1

        # إعادة dict مع ضمان int لكل قيمة
        result: Dict[int, Tuple[int, int, int, int]] = {}
        for tid, trk in self._tracks.items():
            b = trk["box"]
            result[tid] = (int(b[0]), int(b[1]), int(b[2]), int(b[3]))
        return result


# ═══════════════════════════════════════════════════════════════
#  DRIVING EVALUATOR
# ═══════════════════════════════════════════════════════════════
class DrivingEvaluator:
    def __init__(self, fps: float = 30.0):
        self.fps = fps
        self.buckets: Dict[str, ScoreBucket] = {
            k: ScoreBucket(mx) for k, _, _, mx in EXAM_CRITERIA
        }
        self.recent_events: deque = deque(maxlen=8)
        self._speed_hist: deque = deque(maxlen=90)
        self._jerk_hist:  deque = deque(maxlen=90)
        self._dist_hist:  deque = deque(maxlen=90)
        self._dev_hist:   deque = deque(maxlen=90)
        self._prev_speed: float = 0.0
        self._bump_flag:   bool = False
        self._stop_flag:   bool = False
        self._ne_flag:     bool = False

    def _ctx(self) -> Dict[str, Any]:
        c = dict(ready=False, smooth=False, stable_speed=False,
                 safe_dist=False, lane_ok=False)
        if len(self._speed_hist) < 20:
            return c
        c["ready"] = True
        sp = list(self._speed_hist)[-60:]
        jk = list(self._jerk_hist)[-60:]
        ds = list(self._dist_hist)[-60:]
        dv = list(self._dev_hist)[-30:]
        c["stable_speed"] = float(np.var(sp)) < 50.0
        if jk:
            c["smooth"] = float(np.mean(jk)) < 3.0 and float(np.max(jk)) < 10.0
        if ds:
            c["safe_dist"] = float(np.mean(ds)) > CFG.SAFE_DIST_M
        if dv:
            c["lane_ok"] = float(np.mean(dv)) < 0.20 and float(np.var(dv)) < 0.006
        return c

    def update(self, s: FrameState, fidx: int, frame: Optional[np.ndarray] = None):
        dv = s.speed_kmh - self._prev_speed
        s.jerk_ms2    = abs(dv) / 3.6 * self.fps
        self._prev_speed = s.speed_kmh
        self._speed_hist.append(s.speed_kmh)
        self._jerk_hist.append(s.jerk_ms2)
        self._dist_hist.append(s.dist_to_ahead)
        if s.lane.center_x and s.lane.lane_width:
            dev = abs(s.frame_w // 2 - s.lane.center_x) / max(1, s.lane.lane_width)
            self._dev_hist.append(dev)
        s.is_intersection = (
            s.lane.road_type in (RoadType.INTERSECTION, RoadType.ROUNDABOUT)
            or s.detected_stop_sign
        )
        ctx = self._ctx()
        if ctx["ready"]:
            self._eval(s, fidx, dv, ctx, frame)
        else:
            for b in self.buckets.values():
                b.tick()

    def _eval(self, s: FrameState, f: int, dv: float,
              ctx: Dict, frame: Optional[np.ndarray]):

        fh  = s.frame_h
        fw  = s.frame_w
        lim = CFG.SPEED_LIMIT_KMH
        is_curve = s.lane.road_type in (
            RoadType.CURVE_LEFT, RoadType.CURVE_RIGHT, RoadType.SHARP_TURN)
        cur_dev  = float(self._dev_hist[-1]) if self._dev_hist else 0.0
        cars     = [d for d in s.get_all(CFG.CLS_CAR) if is_valid_vehicle(d, fh)]
        peds     = [d for d in s.get_all(CFG.CLS_PERSON) if is_valid_person(d, fh, fw)]
        near_ped = [p for p in peds if p.y2 > fh * 0.45]
        bump     = s.get_speed_bump()
        cw       = s.get_crosswalk()
        ne       = s.get_no_entry()
        decel    = -dv
        decel_ms2 = decel / 3.6 * self.fps

        # helper
        B = self.buckets

        # ── 1. SURROUNDINGS ──────────────────────────────────
        if bump and (bump.h / fh) > 0.10:
            if s.speed_kmh <= CFG.BUMP_SPEED_MAX:
                B["surroundings"].reward()
                self._evt("Correct speed on bump ✓", "سرعة صحيحة على المطبة ✓", EventKind.GOOD)
                self._bump_flag = False
            elif not self._bump_flag:
                self._bump_flag = True
                B["surroundings"].penalize(2.0, "High speed on bump", "سرعة عالية على المطبة", f, "bump")
                self._evt("High speed on bump!", "سرعة عالية على المطبة!", EventKind.MISS)
        else:
            self._bump_flag = False
            if ctx["stable_speed"] and not is_curve:
                B["surroundings"].reward(0.002 * TOTAL_MARKS)
            elif is_curve and s.speed_kmh > lim * 0.75:
                B["surroundings"].penalize(0.3, "Fast in curve", "سرعة عالية في منعطف", f, "surr_cv")
            else:
                B["surroundings"].tick()

        # ── 2. POSITIONING ───────────────────────────────────
        if s.lane.center_x and s.lane.lane_width:
            if cur_dev < 0.10:
                B["positioning"].reward(0.005 * TOTAL_MARKS)
            elif cur_dev < 0.22:
                B["positioning"].tick()
            elif cur_dev < 0.40:
                B["positioning"].penalize(0.15, "Slight drift", "انحراف خفيف", f, "pos_d", 30)
            else:
                B["positioning"].penalize(0.6, "Poor positioning", "تموضع سيئ", f, "pos_b", 45)
        else:
            B["positioning"].tick()

        # ── 3. LANE KEEPING ──────────────────────────────────
        if s.lane.center_x and s.lane.lane_width:
            if cur_dev < 0.15 and ctx["lane_ok"]:
                B["lane_keeping"].reward(0.005 * TOTAL_MARKS)
            elif cur_dev < 0.30:
                B["lane_keeping"].tick()
            elif cur_dev < 0.50:
                B["lane_keeping"].penalize(0.2, "Lane deviation", "انحراف عن المسار", f, "lk_d", 30)
            else:
                B["lane_keeping"].penalize(1.0, "Lane departure!", "خروج من المسار!", f, "lk_dep", 45)
                self._evt("Lane departure!", "خروج من المسار!", EventKind.MISS)
        else:
            B["lane_keeping"].tick()

        # ── 4. TURNING ───────────────────────────────────────
        if not is_curve:
            B["turning"].reward(0.002 * TOTAL_MARKS)
        elif s.speed_kmh <= lim * 0.55 and ctx["smooth"]:
            B["turning"].reward(0.006 * TOTAL_MARKS)
        elif s.speed_kmh <= lim * 0.75:
            B["turning"].tick()
        elif s.speed_kmh <= lim * 0.90:
            B["turning"].penalize(0.3, "Fast in turn", "سرعة في الدوران", f, "turn_f", 45)
        else:
            B["turning"].penalize(0.8, "Very fast in turn!", "سرعة عالية جداً في الدوران!", f, "turn_vf", 45)
            self._evt("Very fast in turn!", "سرعة جداً في الدوران!", EventKind.MISS)

        # ── 5. SIGN AWARENESS ────────────────────────────────
        if s.light_color == "red":
            if s.speed_kmh <= CFG.SPEED_STOPPED:
                B["sign_awareness"].reward(0.008 * TOTAL_MARKS)
            elif s.speed_kmh < 12:
                B["sign_awareness"].tick()
            else:
                B["sign_awareness"].penalize(2.0, "Ran red light", "تجاوز إشارة حمراء", f, "red", 90)
                self._evt("Ran red light!", "تجاوز إشارة حمراء!", EventKind.MISS)
        elif s.light_color == "yellow":
            if s.speed_kmh <= lim * 0.55:
                B["sign_awareness"].reward(0.004 * TOTAL_MARKS)
            elif s.speed_kmh > lim * 0.80:
                B["sign_awareness"].penalize(0.5, "Fast on yellow", "سرعة على الأصفر", f, "yel", 45)
            else:
                B["sign_awareness"].tick()
        elif s.light_color == "green" and s.speed_kmh > 0:
            B["sign_awareness"].reward(0.002 * TOTAL_MARKS)
        else:
            B["sign_awareness"].tick()

        # ممنوع الدخول
        if ne and (ne.h / fh) > 0.08:
            if s.speed_kmh > CFG.SPEED_STOPPED and not self._ne_flag:
                self._ne_flag = True
                B["sign_awareness"].penalize(3.0, "No-entry violation", "مخالفة ممنوع الدخول", f, "ne", 120)
                self._evt("No-entry violation!", "مخالفة ممنوع الدخول!", EventKind.MISS)
        else:
            self._ne_flag = False

        # ── 6. TRAFFIC AWARENESS ─────────────────────────────
        if cars:
            if s.dist_to_ahead > CFG.SAFE_DIST_M * 1.5:
                B["traffic_aware"].reward(0.01 * TOTAL_MARKS)
            elif s.dist_to_ahead > CFG.SAFE_DIST_M:
                B["traffic_aware"].tick()
            elif s.dist_to_ahead > CFG.WARN_DIST_M:
                B["traffic_aware"].penalize(0.2, "Close following", "متابعة قريبة", f, "ta_c", 30)
            else:
                B["traffic_aware"].penalize(0.4, "Unsafe distance", "مسافة غير آمنة", f, "ta_u", 50)

        else:
            if ctx["stable_speed"]:
                B["traffic_aware"].reward(0.007 * TOTAL_MARKS)
            elif ctx["smooth"]:
                B["traffic_aware"].reward(0.004 * TOTAL_MARKS)
            else:
                B["traffic_aware"].tick()
        # ── 7. GROUND MARKS ──────────────────────────────────
        if cw and (cw.h / fh) > 0.07:
            if s.speed_kmh <= 15:
                B["ground_marks"].reward(0.007 * TOTAL_MARKS)
            elif s.speed_kmh <= 25:
                B["ground_marks"].tick()
            else:
                B["ground_marks"].penalize(1.0, "Fast on crosswalk", "سرعة على ممر مشاة", f, "cw", 60)
                self._evt("Fast on crosswalk!", "سرعة على ممر مشاة!", EventKind.MISS)
        else:
            B["ground_marks"].reward(0.001 * TOTAL_MARKS)

        # ── 8. INTERSECTIONS ─────────────────────────────────
        if s.is_intersection:
            if s.speed_kmh <= lim * 0.40 and ctx["smooth"]:
                B["intersections"].reward(0.007 * TOTAL_MARKS)
            elif s.speed_kmh <= lim * 0.55:
                B["intersections"].tick()
            elif s.speed_kmh <= lim * 0.70:
                B["intersections"].penalize(0.3, "Fast at intersection", "سرعة في المقاطعة", f, "int_f", 45)
            else:
                B["intersections"].penalize(0.8, "Very fast at intersection!", "سرعة عالية في المقاطعة!", f, "int_vf", 45)
                self._evt("Fast at intersection!", "سرعة في المقاطعة!", EventKind.MISS)
        else:
            B["intersections"].tick()

        # ── 9. NORMAL STOP ───────────────────────────────────
        if s.speed_kmh < CFG.SPEED_STOPPED:
            if abs(dv) < 3.0:
                B["normal_stop"].reward(0.006 * TOTAL_MARKS)
            elif abs(dv) < 8.0:
                B["normal_stop"].tick()
            else:
                B["normal_stop"].penalize(0.5, "Rough stop", "وقوف غير سلس", f, "ns_r", 45)
        elif s.speed_kmh < 20:
            B["normal_stop"].tick()
        else:
            B["normal_stop"].reward(0.001 * TOTAL_MARKS)

        # ── 10. SUDDEN STOP ──────────────────────────────────
        if ctx["smooth"] and decel_ms2 < 2.0:
            B["sudden_stop"].reward(0.004 * TOTAL_MARKS)
        elif decel_ms2 < 5.0:
            B["sudden_stop"].tick()
        else:
            has_reason = (s.dist_to_ahead < CFG.WARN_DIST_M
                          or s.light_color == "red"
                          or len(near_ped) > 0
                          or bump is not None
                          or s.is_intersection)
            if has_reason:
                B["sudden_stop"].reward(0.003 * TOTAL_MARKS)  # كبح مبرر
            elif decel_ms2 < 9.0:
                B["sudden_stop"].penalize(0.5, "Moderate sudden brake", "كبح مفاجئ", f, "sb_m", 30)
            else:
                B["sudden_stop"].penalize(2.0, "Hard brake (no reason)", "فرامل مفاجئة بدون سبب", f, "sb_h", 45)
                self._evt("Sudden brake!", "فرامل مفاجئة!", EventKind.MISS)

        # ── 11. INTERSECT SAFETY ─────────────────────────────
        if s.is_intersection:
            if s.dist_to_ahead > CFG.SAFE_DIST_M:
                B["intersect_safety"].reward(0.007 * TOTAL_MARKS)
            elif s.dist_to_ahead > CFG.WARN_DIST_M:
                B["intersect_safety"].tick()
            elif s.dist_to_ahead > CFG.CRITICAL_DIST_M:
                B["intersect_safety"].penalize(0.4, "Short dist in int.", "مسافة قصيرة في التقاطع", f, "is_s", 45)
            else:
                B["intersect_safety"].penalize(1.0, "Critical dist in int.!", "مسافة حرجة في التقاطع!", f, "is_c", 45)
                self._evt("Critical dist in int.!", "مسافة حرجة في التقاطع!", EventKind.MISS)
        else:
            B["intersect_safety"].tick()

        # ── 12. STOP COMPLIANCE ──────────────────────────────
        if s.detected_stop_sign:
            if s.speed_kmh <= CFG.SPEED_STOPPED and not self._stop_flag:
                self._stop_flag = True
                B["stop_compliance"].reward(0.010 * TOTAL_MARKS)
                self._evt("Stopped at sign ✓", "توقف عند الإشارة ✓", EventKind.GOOD)
            elif s.speed_kmh > CFG.SPEED_STOPPED and not self._stop_flag:
                self._stop_flag = True
                B["stop_compliance"].penalize(1.5, "Didn't stop at sign", "لم يتوقف عند الإشارة", f, "stp", 90)
                self._evt("Didn't stop at sign!", "لم يتوقف!", EventKind.MISS)
        else:
            self._stop_flag = False
            B["stop_compliance"].tick()

        # ── 13. PEDESTRIANS ──────────────────────────────────
        if near_ped:
            if s.speed_kmh <= 10 and ctx["smooth"]:
                B["pedestrians"].reward(0.008 * TOTAL_MARKS)
                self._evt("Yielded to pedestrian ✓", "تنازل للمشاة ✓", EventKind.GOOD)
            elif s.speed_kmh <= 20:
                B["pedestrians"].tick()
            elif s.speed_kmh <= 30:
                B["pedestrians"].penalize(0.5, "Fast near pedestrian", "سرعة قرب مشاة", f, "ped_f", 30)
            else:
                B["pedestrians"].penalize(1.5, "Didn't yield to pedestrian!", "لم يتنازل للمشاة!", f, "ped_m", 45)
                self._evt("Didn't yield to pedestrian!", "لم يتنازل للمشاة!", EventKind.MISS)
        else:
            B["pedestrians"].reward(0.001 * TOTAL_MARKS)

        # ── 14. VEHICLES ─────────────────────────────────────
        if cars:
            if s.dist_to_ahead > CFG.SAFE_DIST_M and ctx["smooth"]:
                B["vehicles"].reward(0.005 * TOTAL_MARKS)
            elif s.dist_to_ahead > CFG.WARN_DIST_M:
                B["vehicles"].tick()
            elif s.dist_to_ahead > CFG.CRITICAL_DIST_M:
                B["vehicles"].penalize(0.2, "Close to vehicle", "قريب من مركبة", f, "veh_c", 30)
            else:
                B["vehicles"].penalize(0.6, "Tailgating!", "مطاردة خطيرة!", f, "veh_t", 45)
                self._evt("Tailgating!", "مطاردة خطيرة!", EventKind.MISS)
        else:
            B["vehicles"].reward(0.002 * TOTAL_MARKS)

        # ── 15. ROAD ENV ─────────────────────────────────────
        r_spd = s.speed_kmh / max(1.0, lim)
        if 0.30 < r_spd <= 0.90 and ctx["stable_speed"]:
            B["road_env"].reward(0.005 * TOTAL_MARKS)
        elif r_spd <= 0.30 and s.speed_kmh < 5:
            B["road_env"].penalize(0.15, "Too slow", "بطيء جداً", f, "re_slow", 60)
        elif r_spd <= 1.05:
            B["road_env"].tick()
        elif r_spd <= 1.20:
            B["road_env"].penalize(0.25, "Speeding", "تجاوز سرعة", f, "re_sp", 30)
        else:
            B["road_env"].penalize(0.6, "Excessive speed!", "سرعة مفرطة!", f, "re_ex", 45)
            self._evt("Excessive speed!", "سرعة مفرطة!", EventKind.MISS)

        # ── 16. OBSTACLES ────────────────────────────────────
        if s.dist_to_ahead > CFG.SAFE_DIST_M:
            B["obstacles"].reward(0.004 * TOTAL_MARKS)
        elif s.dist_to_ahead > CFG.WARN_DIST_M:
            B["obstacles"].tick()
        elif s.dist_to_ahead > CFG.CRITICAL_DIST_M:
            B["obstacles"].penalize(0.2, "Obstacle close", "عائق قريب", f, "obs_c", 30)
        else:
            B["obstacles"].penalize(0.5, "Obstacle critical!", "عائق بالغ القرب!", f, "obs_cr", 45)
            self._evt("Obstacle too close!", "عائق قريب جداً!", EventKind.MISS)

    def _evt(self, en: str, ar: str, kind: EventKind):
        self.recent_events.append({"en": en, "ar": ar, "kind": kind.value, "ts": time.time()})

    def total_score(self) -> int:
        return sum(b.score for b in self.buckets.values())

    





    def build_result(self) -> Dict:
        total = self.total_score()
        cats  = []
        for k, nar, _, mx in EXAM_CRITERIA:
            cats.append({
                "name":       nar,
                "score":      self.buckets[k].score,
                "max":        mx,
                "violations": [v.reason_ar for v in self.buckets[k].violations],
            })

        viols = []
        for b in self.buckets.values():
            for v in b.violations:
                viols.append({"reason": v.reason_ar, "deduction": round(v.deduction, 2)})

        return {
            "achieved_marks":     total,
            "total_marks":        TOTAL_MARKS,
            "percentage":         round((total / TOTAL_MARKS) * 100, 1),
            "categories":         cats,
            "total_violations":   len(viols),
            "violations_summary": viols[:20],
        }


        

        
        
        viols = []
        for b in self.buckets.values():
            for v in b.violations:
                viols.append({"reason": v.reason_ar, "deduction": round(v.deduction, 2)})
        return {
            "achieved_marks":     total,
            "total_marks":        TOTAL_MARKS,
            "percentage":         round((total / TOTAL_MARKS) * 100, 1),
            "categories":         cats,
            "total_violations":   len(viols),
            "violations_summary": viols[:20],
        }


# ═══════════════════════════════════════════════════════════════
#  RENDERING
# ═══════════════════════════════════════════════════════════════
_CLR = dict(panel=(15,17,25), accent=(0,210,255), text=(200,200,200),
            good=(50,215,90), warn=(30,175,255), bad=(50,55,230))
_LANE_C = [(0,230,100), (0,155,255), (255,170,0), (200,0,240)]

TRAFFIC_LABELS: Dict[int, Tuple[str, Tuple]] = {
    0:  ("Person",        (0,   255, 255)),
    2:  ("Car",           (0,   200,  50)),
    3:  ("Motorcycle",    (50,  200, 255)),
    5:  ("Bus",           (0,   165, 255)),
    7:  ("Truck",         (180, 100, 255)),
    9:  ("Traffic Light", (255, 200,   0)),
    11: ("Stop Sign",     (0,     0, 255)),
}
SIGN_LABELS: Dict[int, Tuple[str, Tuple]] = {
    0: ("Crosswalk",  (255, 255,   0)),
    1: ("Speed Bump", (255, 165,   0)),
    2: ("No Entry",   (0,     0, 200)),
}


def _sc(r: float) -> Tuple:
    if r >= 0.70: return _CLR["good"]
    if r >= 0.40: return _CLR["warn"]
    return _CLR["bad"]


def _draw_label(frame: np.ndarray, text: str, x1: int, y1: int, col: Tuple):
    """رسم تسمية واضحة مع خلفية داكنة"""
    bg_w = len(text) * 8 + 8
    y_bg = max(0, y1 - 20)
    cv2.rectangle(frame, (x1, y_bg), (x1 + bg_w, y1), (15, 15, 25), -1)
    cv2.putText(frame, text, (x1 + 3, max(12, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.46, col, 1, cv2.LINE_AA)


def render_lanes(frame: np.ndarray, lane: LaneResult):
    h, w = frame.shape[:2]
    if lane.left_pts is not None and lane.right_pts is not None:
        poly = np.vstack([lane.left_pts, lane.right_pts[::-1]]).astype(np.int32)
        ov   = frame.copy()
        cv2.fillPoly(ov, [poly], (0, 180, 60))
        cv2.addWeighted(ov, 0.15, frame, 0.85, 0, frame)
    for i, pts in enumerate(lane.all_pts):
        for j in range(1, len(pts)):
            p0 = (int(pts[j-1][0]), int(pts[j-1][1]))
            p1 = (int(pts[j][0]),   int(pts[j][1]))
            cv2.line(frame, p0, p1, _LANE_C[i % len(_LANE_C)], 3, cv2.LINE_AA)
    if lane.left_x_bot is not None:
        cv2.circle(frame, (int(lane.left_x_bot), h - 15), 8, _CLR["warn"], -1)
    if lane.right_x_bot is not None:
        cv2.circle(frame, (int(lane.right_x_bot), h - 15), 8, _CLR["warn"], -1)
    if lane.center_x is not None:
        cx = int(lane.center_x)
        cv2.line(frame, (cx, h), (cx, int(h * 0.55)), _CLR["accent"], 2, cv2.LINE_AA)
    lbl = ROAD_LABELS[lane.road_type]
    col = ROAD_COLORS[lane.road_type]
    tx  = w // 2 - 80
    ty  = int(h * 0.06)
    cv2.rectangle(frame, (tx - 4, ty - 20), (tx + 180, ty + 6), (20, 20, 30), -1)
    cv2.putText(frame, lbl, (tx, ty), cv2.FONT_HERSHEY_DUPLEX, 0.55, col, 1, cv2.LINE_AA)


def render_detections(frame: np.ndarray, state: FrameState,
                      tracked_cars: Dict[int, Tuple[int,int,int,int]]):
    fh, fw = frame.shape[:2]

    # ── مركبات مع ID ──
    for tid, box in tracked_cars.items():
        tx1, ty1, tx2, ty2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        # تأكد من حدود الإطار
        tx1 = max(0, min(fw-1, tx1)); tx2 = max(0, min(fw-1, tx2))
        ty1 = max(0, min(fh-1, ty1)); ty2 = max(0, min(fh-1, ty2))
        if tx2 <= tx1 or ty2 <= ty1:
            continue
        d   = state.dist_to_ahead
        col = (_CLR["good"] if d >= CFG.SAFE_DIST_M
               else _CLR["warn"] if d >= CFG.WARN_DIST_M
               else _CLR["bad"])
        cv2.rectangle(frame, (tx1, ty1), (tx2, ty2), col, 2)
        _draw_label(frame, f"Car #{tid % 100}", tx1, ty1, col)

    # ── بقية الكائنات ──
    for d in state.dets:
        x1 = max(0, min(fw-1, d.x1)); x2 = max(0, min(fw-1, d.x2))
        y1 = max(0, min(fh-1, d.y1)); y2 = max(0, min(fh-1, d.y2))
        if x2 <= x1 or y2 <= y1:
            continue

        if d.source == "traffic":
            if d.cls == CFG.CLS_PERSON:
                if not is_valid_person(d, fh, fw):
                    continue
                lbl, col = "Person", (0, 255, 255)
            elif d.cls == CFG.CLS_STOP:
                if not is_valid_stop_sign(frame, d):
                    continue
                lbl, col = "STOP SIGN", (0, 0, 255)
            elif d.cls == CFG.CLS_LIGHT and state.light_color != "unknown":
                cm  = {"red": (0,0,255), "yellow": (0,255,255), "green": (0,255,0)}
                col = cm.get(state.light_color, (0, 255, 255))
                lbl = f"Light:{state.light_color.upper()}"
            elif d.cls == CFG.CLS_CAR:
                continue  # يُعرض عبر tracked_cars
            elif d.cls in TRAFFIC_LABELS:
                lbl, col = TRAFFIC_LABELS[d.cls]
            else:
                continue  # تجاهل كلاس غير معروف

            cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
            _draw_label(frame, f"{lbl} {d.conf:.2f}", x1, y1, col)

        elif d.source == "signs":
            if d.cls not in SIGN_LABELS:
                continue
            lbl, col = SIGN_LABELS[d.cls]
            cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
            _draw_label(frame, lbl, x1, y1, col)


def render_hud(frame: np.ndarray, ev: DrivingEvaluator,
               speed_kmh: float, dist_m: float):
    h, w   = frame.shape[:2]
    PW, PH = 310, min(h - 16, 430)
    panel  = np.full((PH, PW, 3), _CLR["panel"], dtype=np.uint8)

    cv2.putText(panel, "DRIVING CRITERIA", (8, 18),
                cv2.FONT_HERSHEY_DUPLEX, 0.50, _CLR["accent"], 1, cv2.LINE_AA)
    cv2.line(panel, (8, 24), (PW - 8, 24), _CLR["accent"], 1)

    y = 40
    for key, _, nen, mx in EXAM_CRITERIA:
        if y + 14 > PH - 38:
            break
        bkt = ev.buckets[key]
        r   = bkt.ratio
        col = _sc(r)
        bw  = int(r * 150)
        cv2.putText(panel, nen, (8, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.28, _CLR["text"], 1, cv2.LINE_AA)
        cv2.rectangle(panel, (8, y+3), (158, y+12), (35, 37, 52), -1)
        if bw > 0:
            cv2.rectangle(panel, (8, y+3), (8+bw, y+12), col, -1)
        cv2.putText(panel, f"{bkt.score}/{mx}", (162, y+12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.30, col, 1, cv2.LINE_AA)
        y += 23

    ts    = ev.total_score()
    pct   = round(ts / TOTAL_MARKS * 100, 1)
    tc    = _sc(ts / TOTAL_MARKS)
    cv2.line(panel, (8, PH-34), (PW-8, PH-34), (60, 60, 80), 1)
    cv2.putText(panel, f"TOTAL: {ts}/{TOTAL_MARKS}  ({pct}%)",
                (8, PH-14), cv2.FONT_HERSHEY_DUPLEX, 0.46, tc, 1, cv2.LINE_AA)

    roi = frame[8:8+PH, 8:8+PW]
    if roi.shape == panel.shape:
        cv2.addWeighted(roi, 1 - CFG.PANEL_ALPHA, panel, CFG.PANEL_ALPHA, 0,
                        dst=frame[8:8+PH, 8:8+PW])

    # ── سرعة ──
    sc = (_CLR["bad"] if speed_kmh > CFG.SPEED_LIMIT_KMH
          else _CLR["warn"] if speed_kmh > CFG.SPEED_LIMIT_KMH * 0.90
          else _CLR["good"])
    bx, by = w // 2 - 75, int(h * 0.06)
    cv2.rectangle(frame, (bx, by-22), (bx+150, by+8), (20,20,30), -1)
    cv2.putText(frame, f" {speed_kmh:.0f} km/h",
                (bx+4, by), cv2.FONT_HERSHEY_DUPLEX, 0.55, sc, 1, cv2.LINE_AA)

    # ── مسافة ──
    dc  = (_CLR["bad"] if dist_m < CFG.CRITICAL_DIST_M
           else _CLR["warn"] if dist_m < CFG.SAFE_DIST_M
           else _CLR["good"])
    dtx = f" Dist:{dist_m:.1f}m" if dist_m < 150 else " Dist: Clear"
    cv2.rectangle(frame, (bx, by+12), (bx+150, by+34), (20,20,30), -1)
    cv2.putText(frame, dtx, (bx+4, by+28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, dc, 1, cv2.LINE_AA)

    # ── أحداث مؤقتة ──
    now    = time.time()
    active = [v for v in ev.recent_events if now - v["ts"] < 3.5]
    if active:
        vy = h - 12 - len(active) * 25
        for ev_item in active[-5:]:
            vc = ((0,0,255) if ev_item["kind"] == "miss"
                  else (0,165,255) if ev_item["kind"] == "warn"
                  else (50,215,90))
            cv2.rectangle(frame, (10, vy-17), (w-10, vy+5), (12,12,22), -1)
            cv2.putText(frame, f"  {ev_item['en']}",
                        (14, vy), cv2.FONT_HERSHEY_SIMPLEX, 0.42, vc, 1, cv2.LINE_AA)
            vy += 25


# ═══════════════════════════════════════════════════════════════
#  SKIP CALCULATOR
# ═══════════════════════════════════════════════════════════════
def _skip(total: int, fps: float) -> int:
    sec = total / max(fps, 1.0)
    if sec <= 60:   return 4
    if sec <= 180:  return 8
    if sec <= 300:  return 14
    if sec <= 600:  return 22
    if sec <= 900:  return 30
    return 40


# ═══════════════════════════════════════════════════════════════
#  MAIN PROCESS
# ═══════════════════════════════════════════════════════════════
def process_video(video_path: str, progress=gr.Progress()) -> Tuple[Any, Dict]:
    if video_path is None:
        return (None, {"error": "No video provided"})

    progress(0.0, desc="Loading models...")

    try:
        yolo_t = YOLO(CFG.YOLO_TRAFFIC_PATH)
    except Exception as e:
        return (None, {"error": f"Traffic model error: {e}"})

    yolo_s = None
    try:
        if Path(CFG.YOLO_SIGNS_PATH).exists():
            yolo_s = YOLO(CFG.YOLO_SIGNS_PATH)
    except Exception:
        pass

    lane_d  = LaneDetector()
    light_a = TrafficLightAnalyzer()
    phys    = PhysicsEstimator()
    tracker = SimpleTracker()
    ev      = DrivingEvaluator()

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return (None, {"error": "Cannot open video"})

    fw           = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    fh           = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_v        = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    total_f      = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_f        = min(total_f, CFG.MAX_FRAMES)
    SKIP         = _skip(total_f, fps_v)
    dur_min      = total_f / max(fps_v, 1.0) / 60.0

    print(f"[INFO] {total_f} frames @ {fps_v:.1f}fps = {dur_min:.1f}min | SKIP={SKIP}")

    out_path = "/tmp/output_analyzed.mp4"
    out_w, out_h = fw // 2, fh // 2
    writer   = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps_v, (out_w, out_h))


    cur_dist = 999.0
    prev_vis = None
    idx      = 0

    progress(0.05, desc="Analyzing...")

    while True:
        ok, frame = cap.read()
        if not ok or idx >= max_f:
            break

        if idx % 200 == 0:
            pct = 0.05 + (idx / max(1, max_f)) * 0.90
            progress(pct, desc=f"Frame {idx}/{max_f}  {idx/fps_v/60:.1f}/{dur_min:.1f}min")

        if idx % SKIP == 0:
            state = FrameState(frame_w=fw, frame_h=fh)

            # YOLO traffic
            res_t = yolo_t(frame, imgsz=320, conf=0.40, verbose=False)
            for box in res_t[0].boxes:
                cx1, cy1, cx2, cy2 = map(int, box.xyxy[0].tolist())
                state.dets.append(Detection(
                    int(box.cls[0].item()), float(box.conf[0].item()),
                    cx1, cy1, cx2, cy2, "traffic"))

            # YOLO signs
            if yolo_s:
                res_s = yolo_s(frame, imgsz=320, conf=0.40, verbose=False)
                for box in res_s[0].boxes:
                    cx1, cy1, cx2, cy2 = map(int, box.xyxy[0].tolist())
                    state.dets.append(Detection(
                        int(box.cls[0].item()), float(box.conf[0].item()),
                        cx1, cy1, cx2, cy2, "signs"))

            # تحقق من إشارة STOP
            stop_raw = state.get(CFG.CLS_STOP, "traffic")
            state.detected_stop_sign = (stop_raw is not None
                                        and is_valid_stop_sign(frame, stop_raw))

            # تتبع السيارات
            car_boxes = np.array([
                [d.x1, d.y1, d.x2, d.y2]
                for d in state.dets
                if d.cls == CFG.CLS_CAR and is_valid_vehicle(d, fh)
            ], dtype=np.float32)
            tracked_cars = tracker.update(car_boxes)

            # فيزياء
            state.speed_kmh  = phys.estimate_speed(frame)
            state.lane       = lane_d.detect(frame)
            state.lane.road_type = lane_d.classify_road(state.lane)

            # إشارة ضوئية
            lt = state.get(CFG.CLS_LIGHT, "traffic")
            if lt:
                x1_, y1_, x2_, y2_ = lt.box
                roi = frame[max(0,y1_):y2_, max(0,x1_):x2_]
                state.light_color, _ = light_a.analyze(roi)

            # مسافة
            in_lane = [d for d in state.dets
                       if d.cls == CFG.CLS_CAR
                       and is_valid_vehicle(d, fh)
                       and abs(d.cx - fw // 2) < fw * 0.40]
            if in_lane:
                closest  = max(in_lane, key=lambda c: c.y2)
                cur_dist = phys.dist_to_det(closest, fh)
            else:
                cur_dist = 999.0
            state.dist_to_ahead = cur_dist

            # تقييم
            ev.update(state, idx, frame)

            # رسم
            vis = frame.copy()
            render_lanes(vis, state.lane)
            render_detections(vis, state, tracked_cars)
            render_hud(vis, ev, state.speed_kmh, cur_dist)
            prev_vis = vis
            if (idx // SKIP) % 500 == 0:
                gc.collect()
        write_frame = prev_vis if prev_vis is not None else frame
        writer.write(cv2.resize(write_frame, (out_w, out_h), interpolation=cv2.INTER_AREA))
        idx += 1

    cap.release()
    writer.release()
    progress(0.97, desc="Building report...")
    return (out_path, ev.build_result())


# ═══════════════════════════════════════════════════════════════
#  GRADIO UI
# ═══════════════════════════════════════════════════════════════
try:
    gr.config.set_max_file_size(3 * 1024 * 1024 * 1024)
except AttributeError:
    pass

with gr.Blocks(theme=gr.themes.Soft(), title="AI Driving Exam") as demo:
    gr.Markdown("# 🚗 نظام تقييم القيادة الآلي — الشوارع الأردنية")
    gr.Markdown(
        "**56 درجة إجمالاً · 16 محور تقييم · نقاط تزيد وتنقص · يدعم فيديو 30 دقيقة**"
    )
    with gr.Row():
        with gr.Column():
            vid_in = gr.Video(label="📁 رفع فيديو كاميرا السيارة")
            btn    = gr.Button("▶ بدء التحليل", variant="primary", size="lg")
        with gr.Column():
            vid_out = gr.Video(label="📺 الفيديو المحلَّل")
    json_out = gr.JSON(label="📊 التقرير النهائي")
    btn.click(fn=process_video, inputs=vid_in, outputs=[vid_out, json_out])
    demo.queue(max_size=1)

if __name__ == "__main__":
    demo.launch(share=False)
