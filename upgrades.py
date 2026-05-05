"""
upgrades.py
===========
Drop-in upgrades for the Driving Evaluation System v5.
Import everything from here into main.py.

Modules:
    1. SpeedEstimator      — optical flow OR GPS input
    2. MiDaSDepth          — real metric depth from MiDaS
    3. SORTTracker         — multi-object tracking with IDs
    4. BehaviorWindow      — time-window pattern analysis (3-5 sec)
    5. MLRiskScorer        — weighted ML-based risk + quality score
    6. ReportGenerator     — final PDF report
"""





from __future__ import annotations
import time, warnings, math
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn.functional as F

warnings.filterwarnings("ignore")


# ══════════════════════════════════════════════════════════════
#  1. SPEED ESTIMATOR
#     Option A: GPS / simulated external speed feed
#     Option B: Lucas-Kanade optical flow (relative ego-motion)
#
#  Usage:
#     est = SpeedEstimator(fps=30, focal_px=700, cam_height_m=1.2)
#     speed_kmh = est.update(frame, gps_kmh=None)
# ══════════════════════════════════════════════════════════════

class SpeedEstimator:
    """
    Dual-mode speed estimator.

    Mode A (GPS):   Pass gps_kmh argument each frame → used directly.
                    Structure is ready to receive real OBD-II / GPS data.

    Mode B (Flow):  Uses Lucas-Kanade sparse optical flow on static
                    background features (road surface, lane markings).
                    Converts pixel motion → km/h via camera geometry.

    camera geometry params (Mode B):
        focal_px    — focal length in pixels (calibrate with checkerboard,
                       or estimate: focal_px ≈ image_width / (2*tan(FOV/2)))
        cam_height_m — camera mounting height above road (meters)
        FPS         — video frame rate
    """

    def __init__(self,
                 fps: float = 30.0,
                 focal_px: float = 700.0,
                 cam_height_m: float = 1.2,
                 smoothing: int = 10):
        self.fps = fps
        self.focal_px = focal_px
        self.cam_height_m = cam_height_m

        # Lucas-Kanade parameters
        self._lk_params = dict(
            winSize=(21, 21),
            maxLevel=3,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
        )
        self._feature_params = dict(
            maxCorners=200,
            qualityLevel=0.01,
            minDistance=7,
            blockSize=7,
        )
        self._prev_gray: Optional[np.ndarray] = None
        self._prev_pts:  Optional[np.ndarray] = None
        self._refresh_counter: int = 0

        # Smoothing buffer
        self._speed_buf: deque = deque(maxlen=smoothing)
        self._gps_buf:   deque = deque(maxlen=smoothing)

    # ── public interface ─────────────────────────────────────

    def update(self,
               frame: np.ndarray,
               gps_kmh: Optional[float] = None) -> Dict:
        """
        Returns dict:
            speed_kmh   — best available estimate
            source      — 'gps' | 'flow' | 'unavailable'
            raw_flow_kmh— optical flow estimate (always computed)
            confidence  — 0..1
        """
        flow_result = self._optical_flow(frame)

        if gps_kmh is not None and gps_kmh >= 0:
            self._gps_buf.append(gps_kmh)
            smooth_gps = float(np.mean(self._gps_buf))
            return {
                "speed_kmh":    smooth_gps,
                "source":       "gps",
                "raw_flow_kmh": flow_result["kmh"],
                "confidence":   0.95,
            }

        # Fall back to optical flow
        if flow_result["kmh"] >= 0:
            self._speed_buf.append(flow_result["kmh"])
            smooth = float(np.mean(self._speed_buf))
            return {
                "speed_kmh":    smooth,
                "source":       "flow",
                "raw_flow_kmh": flow_result["kmh"],
                "confidence":   flow_result["confidence"],
            }

        return {
            "speed_kmh":    float(np.mean(self._speed_buf)) if self._speed_buf else 0.0,
            "source":       "unavailable",
            "raw_flow_kmh": 0.0,
            "confidence":   0.0,
        }

    # ── optical flow internals ───────────────────────────────

    def _optical_flow(self, frame: np.ndarray) -> Dict:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Use only bottom-center ROI (road surface, avoids sky/objects)
        roi_y = int(h * 0.55)
        roi_gray = gray[roi_y:, w//4: 3*w//4]

        # Refresh feature points every 15 frames or if too few remain
        self._refresh_counter += 1
        if self._prev_pts is None or \
           self._refresh_counter >= 15 or \
           (self._prev_pts is not None and len(self._prev_pts) < 20):
            pts = cv2.goodFeaturesToTrack(roi_gray, **self._feature_params)
            if pts is None:
                self._prev_gray = gray
                return {"kmh": -1.0, "confidence": 0.0}
            # Offset points back to full-frame coords
            pts[:, 0, 0] += w // 4
            pts[:, 0, 1] += roi_y
            self._prev_pts = pts
            self._refresh_counter = 0

        if self._prev_gray is None:
            self._prev_gray = gray
            return {"kmh": -1.0, "confidence": 0.0}

        # Track points
        curr_pts, status, _ = cv2.calcOpticalFlowPyrLK(
            self._prev_gray, gray, self._prev_pts, None, **self._lk_params
        )

        good_mask = (status == 1).flatten()
        if good_mask.sum() < 8:
            self._prev_gray = gray
            self._prev_pts = None
            return {"kmh": -1.0, "confidence": 0.0}

        prev_good = self._prev_pts[good_mask]
        curr_good = curr_pts[good_mask]

        # Vertical pixel displacement (ego car moves forward → road moves up)
        dy_px = prev_good[:, 0, 1] - curr_good[:, 0, 1]

        # Filter: keep only downward-moving points (road moving up in image)
        # and reject outliers
        dy_px = dy_px[dy_px > 0]
        if len(dy_px) < 5:
            self._prev_gray = gray
            self._prev_pts = curr_pts
            return {"kmh": 0.0, "confidence": 0.3}

        # Remove outliers via IQR
        q1, q3 = np.percentile(dy_px, [25, 75])
        iqr = q3 - q1
        inliers = dy_px[(dy_px >= q1 - 1.5*iqr) & (dy_px <= q3 + 1.5*iqr)]
        if len(inliers) < 3:
            self._prev_gray = gray
            self._prev_pts = curr_pts
            return {"kmh": 0.0, "confidence": 0.2}

        mean_dy = float(np.mean(inliers))

        # Convert pixels/frame → m/s → km/h
        # Physical distance per pixel at road plane:
        #   real_dy_m = (mean_dy / focal_px) * cam_height_m
        # Speed = real_dy_m * fps
        real_dy_m = (mean_dy / self.focal_px) * self.cam_height_m
        speed_ms  = real_dy_m * self.fps
        speed_kmh = speed_ms * 3.6

        # Confidence: ratio of inliers with consistent direction
        confidence = min(1.0, len(inliers) / 60.0)

        self._prev_gray = gray
        self._prev_pts = curr_pts
        return {"kmh": max(0.0, speed_kmh), "confidence": confidence}


# ══════════════════════════════════════════════════════════════
#  2. MIDAS DEPTH ESTIMATOR
#     Provides metric distance to nearest vehicle / obstacle.
#
#  SETUP:
#     Model downloads automatically on first run (~100 MB).
#     Or pre-download:
#       torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
#
#  Usage:
#     depth = MiDaSDepth()
#     result = depth.estimate(frame, roi_boxes=[(x1,y1,x2,y2), ...])
#     result["distances_m"]  → list of metric distances per box
#     result["depth_vis"]    → colorized depth map (for HUD)
# ══════════════════════════════════════════════════════════════

class MiDaSDepth:
    """
    Monocular depth estimation using MiDaS_small.
    Converts relative depth to approximate metric distance.

    Scale calibration:
        On first usage, provide known_dist_m and the depth value
        at that point. Or use the auto-calibration approach:
        assume the road surface at bottom-center is ~2m away,
        and derive scale from that anchor.
    """

    # Known anchor: bottom-center of frame ≈ road surface ≈ 2.5m ahead
    ROAD_ANCHOR_M = 2.5
    # Fraction of frame height for road anchor sampling
    ROAD_ANCHOR_Y_FRAC = 0.92
    ROAD_ANCHOR_X_FRAC = 0.50

    def __init__(self, device: Optional[str] = None, run_every_n: int = 3):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.run_every_n = run_every_n   # only run MiDaS every N frames (speed)
        self._counter = 0
        self._last_depth: Optional[np.ndarray] = None
        self._scale: Optional[float] = None
        self._shift: float = 0.0
        self.model = None
        self.transform = None
        self._load()

    def _load(self):
        try:
            print("[MiDaS] Loading MiDaS_small …")
            midas = torch.hub.load(
                "intel-isl/MiDaS", "MiDaS_small",
                trust_repo=True
            )
            midas.to(self.device).eval()
            transforms = torch.hub.load(
                "intel-isl/MiDaS", "transforms",
                trust_repo=True
            )
            self.model     = midas
            self.transform = transforms.small_transform
            print(f"[MiDaS] Ready on {self.device}")
        except Exception as e:
            print(f"[MiDaS] Load failed: {e}. Depth unavailable.")

    def estimate(self,
                 frame: np.ndarray,
                 roi_boxes: Optional[List[Tuple]] = None
                 ) -> Dict:
        """
        Args:
            frame      — BGR frame
            roi_boxes  — list of (x1,y1,x2,y2) from YOLO detections
                         to measure distance of

        Returns:
            depth_map_raw   — raw MiDaS output (HxW float)
            depth_map_metric— metric depth in meters (HxW)
            depth_vis       — colorized visualization (HxWx3 BGR)
            distances_m     — list of median distances per roi_box
            scale           — current estimated scale factor
        """
        if self.model is None:
            return self._null_result(frame, roi_boxes)

        self._counter += 1
        h, w = frame.shape[:2]

        # Only run inference every N frames
        if self._counter % self.run_every_n == 0:
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            inp = self.transform(img_rgb).to(self.device)

            with torch.no_grad():
                pred = self.model(inp)
                pred = F.interpolate(
                    pred.unsqueeze(1),
                    size=(h, w),
                    mode="bicubic",
                    align_corners=False,
                ).squeeze()

            depth_raw = pred.cpu().numpy()

            # Auto-calibrate scale using road anchor
            anchor_y = int(h * self.ROAD_ANCHOR_Y_FRAC)
            anchor_x = int(w * self.ROAD_ANCHOR_X_FRAC)
            # Average over small patch for stability
            patch = depth_raw[
                max(0, anchor_y-5):anchor_y+5,
                max(0, anchor_x-5):anchor_x+5
            ]
            anchor_depth = float(np.median(patch))

            if anchor_depth > 1e-3:
                # MiDaS outputs inverse depth: larger value = closer
                # metric_depth = scale / midas_value
                self._scale = anchor_depth * self.ROAD_ANCHOR_M
            else:
                self._scale = self._scale or 100.0

            self._last_depth = depth_raw

        if self._last_depth is None:
            return self._null_result(frame, roi_boxes)

        depth_raw   = self._last_depth
        scale       = self._scale or 100.0

        # Convert: metric_depth_m = scale / depth_raw (MiDaS is inverse depth)
        # Clip to avoid division by zero and unrealistic values
        depth_raw_clipped = np.clip(depth_raw, 1e-3, None)
        depth_metric = scale / depth_raw_clipped
        depth_metric = np.clip(depth_metric, 0.5, 150.0)   # 0.5m to 150m

        # Colorize for visualization
        norm = cv2.normalize(depth_metric, None, 0, 255,
                             cv2.NORM_MINMAX, cv2.CV_8U)
        depth_vis = cv2.applyColorMap(255 - norm, cv2.COLORMAP_INFERNO)

        # Extract distances for each bounding box
        distances_m: List[float] = []
        if roi_boxes:
            for (x1, y1, x2, y2) in roi_boxes:
                x1c = max(0, x1); y1c = max(0, y1)
                x2c = min(w-1, x2); y2c = min(h-1, y2)
                if x2c <= x1c or y2c <= y1c:
                    distances_m.append(999.0)
                    continue
                # Use lower 40% of box (closer to camera, more reliable)
                y_mid = y1c + int((y2c - y1c) * 0.6)
                roi_depth = depth_metric[y_mid:y2c, x1c:x2c]
                dist = float(np.median(roi_depth)) if roi_depth.size > 0 else 999.0
                distances_m.append(dist)

        return {
            "depth_map_raw":    depth_raw,
            "depth_map_metric": depth_metric,
            "depth_vis":        depth_vis,
            "distances_m":      distances_m,
            "scale":            scale,
        }

    @staticmethod
    def _null_result(frame, roi_boxes):
        h, w = frame.shape[:2]
        return {
            "depth_map_raw":    np.zeros((h, w), np.float32),
            "depth_map_metric": np.zeros((h, w), np.float32),
            "depth_vis":        np.zeros((h, w, 3), np.uint8),
            "distances_m":      [999.0] * (len(roi_boxes) if roi_boxes else 0),
            "scale":            None,
        }


# ══════════════════════════════════════════════════════════════
#  3. SORT TRACKER
#     Tracks objects across frames, assigns persistent IDs.
#     Uses Kalman Filter + Hungarian algorithm (filterpy).
#
#  Usage:
#     tracker = SORTTracker(max_age=10, min_hits=3, iou_threshold=0.3)
#     tracks = tracker.update(detections_nx5)
#     # detections_nx5: [[x1,y1,x2,y2,score], ...]
#     # tracks: [[x1,y1,x2,y2,track_id], ...]
# ══════════════════════════════════════════════════════════════

try:
    from filterpy.kalman import KalmanFilter
    _FILTERPY_OK = True
except ImportError:
    _FILTERPY_OK = False
    print("[SORT] filterpy not found. Run: pip install filterpy")


def _iou(bb_a, bb_b):
    """IoU between two boxes [x1,y1,x2,y2]."""
    xx1 = max(bb_a[0], bb_b[0]); yy1 = max(bb_a[1], bb_b[1])
    xx2 = min(bb_a[2], bb_b[2]); yy2 = min(bb_a[3], bb_b[3])
    inter = max(0, xx2 - xx1) * max(0, yy2 - yy1)
    area_a = (bb_a[2]-bb_a[0]) * (bb_a[3]-bb_a[1])
    area_b = (bb_b[2]-bb_b[0]) * (bb_b[3]-bb_b[1])
    union = area_a + area_b - inter
    return inter / max(union, 1e-6)


class _KalmanBoxTracker:
    """Single tracked object with Kalman state [x,y,s,r,vx,vy,vs]."""
    count = 0

    def __init__(self, bbox):
        if not _FILTERPY_OK:
            raise ImportError("filterpy required: pip install filterpy")
        self.kf = KalmanFilter(dim_x=7, dim_z=4)
        self.kf.F = np.array([
            [1,0,0,0,1,0,0],
            [0,1,0,0,0,1,0],
            [0,0,1,0,0,0,1],
            [0,0,0,1,0,0,0],
            [0,0,0,0,1,0,0],
            [0,0,0,0,0,1,0],
            [0,0,0,0,0,0,1],
        ], dtype=np.float32)
        self.kf.H = np.array([
            [1,0,0,0,0,0,0],
            [0,1,0,0,0,0,0],
            [0,0,1,0,0,0,0],
            [0,0,0,1,0,0,0],
        ], dtype=np.float32)
        self.kf.R[2:, 2:] *= 10.
        self.kf.P[4:, 4:] *= 1000.
        self.kf.P *= 10.
        self.kf.Q[-1, -1] *= 0.01
        self.kf.Q[4:, 4:] *= 0.01
        self.kf.x[:4] = self._to_z(bbox)
        self.time_since_update = 0
        self.id = _KalmanBoxTracker.count
        _KalmanBoxTracker.count += 1
        self.history: List[np.ndarray] = []
        self.hits = 0
        self.hit_streak = 0
        self.age = 0

    @staticmethod
    def _to_z(bbox):
        """[x1,y1,x2,y2] → [cx,cy,s,r]."""
        w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1]
        return np.array(
            [[bbox[0]+w/2], [bbox[1]+h/2], [w*h], [w/max(h,1)]],
            dtype=np.float32
        )

    @staticmethod
    def _from_x(x):
        """[cx,cy,s,r] → [x1,y1,x2,y2]."""
        w = np.sqrt(abs(x[2]*x[3])); h = abs(x[2]) / max(w, 1e-6)
        return np.array([
            x[0]-w/2, x[1]-h/2,
            x[0]+w/2, x[1]+h/2,
        ]).flatten()

    def predict(self):
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1
        self.age += 1
        if self.kf.x[6] + self.kf.x[2] <= 0:
            self.kf.x[6] = 0
        self.kf.predict()
        self.history.append(self._from_x(self.kf.x))
        return self.history[-1]

    def update(self, bbox):
        self.time_since_update = 0
        self.history = []
        self.hits += 1
        self.hit_streak += 1
        self.kf.update(self._to_z(bbox))

    def get_state(self):
        return self._from_x(self.kf.x)


class SORTTracker:
    """
    SORT: Simple Online and Realtime Tracking.
    Abewley et al. 2016.
    """

    def __init__(self,
                 max_age: int = 10,
                 min_hits: int = 3,
                 iou_threshold: float = 0.3):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers: List[_KalmanBoxTracker] = []
        self.frame_count = 0

    def update(self, dets: np.ndarray) -> np.ndarray:
        """
        dets: Nx5 array [[x1,y1,x2,y2,score], ...]
        Returns: Mx5 array [[x1,y1,x2,y2,track_id], ...]
        """
        if not _FILTERPY_OK:
            # Graceful degradation: return dets with fake IDs
            if len(dets) == 0:
                return np.empty((0, 5))
            fake_ids = np.arange(len(dets)).reshape(-1, 1)
            return np.hstack([dets[:, :4], fake_ids])

        self.frame_count += 1

        # Predict all existing trackers
        trks = np.zeros((len(self.trackers), 5))
        to_del = []
        for i, t in enumerate(self.trackers):
            pos = t.predict()
            trks[i, :4] = pos
            if np.any(np.isnan(pos)):
                to_del.append(i)
        for i in reversed(to_del):
            self.trackers.pop(i)
        trks = trks[~np.isnan(trks).any(axis=1)]

        # Match detections to trackers via IoU
        matched, unmatched_dets, unmatched_trks = \
            self._associate(dets, trks)

        # Update matched trackers
        for d, t in matched:
            self.trackers[t].update(dets[d, :4])

        # Create new trackers for unmatched detections
        for d in unmatched_dets:
            self.trackers.append(_KalmanBoxTracker(dets[d, :4]))

        # Collect results and prune dead trackers
        ret = []
        i = len(self.trackers)
        for trk in reversed(self.trackers):
            d = trk.get_state()
            i -= 1
            if trk.time_since_update > self.max_age:
                self.trackers.pop(i)
                continue
            if trk.hit_streak >= self.min_hits or \
               self.frame_count <= self.min_hits:
                ret.append(np.concatenate([d, [trk.id]]))

        return np.array(ret) if ret else np.empty((0, 5))

    def _associate(self, dets, trks):
        if len(trks) == 0:
            return [], list(range(len(dets))), []
        if len(dets) == 0:
            return [], [], list(range(len(trks)))

        iou_matrix = np.zeros((len(dets), len(trks)), dtype=np.float32)
        for d, det in enumerate(dets):
            for t, trk in enumerate(trks):
                iou_matrix[d, t] = _iou(det, trk)

        # Hungarian via scipy if available, else greedy
        try:
            from scipy.optimize import linear_sum_assignment
            row_ind, col_ind = linear_sum_assignment(-iou_matrix)
            matched_indices = list(zip(row_ind, col_ind))
        except ImportError:
            matched_indices = []
            used_trks = set()
            for d in range(len(dets)):
                best_iou = -1; best_t = -1
                for t in range(len(trks)):
                    if t in used_trks: continue
                    if iou_matrix[d, t] > best_iou:
                        best_iou = iou_matrix[d, t]; best_t = t
                if best_t >= 0 and best_iou >= self.iou_threshold:
                    matched_indices.append((d, best_t))
                    used_trks.add(best_t)

        matched     = [(d, t) for d, t in matched_indices
                       if iou_matrix[d, t] >= self.iou_threshold]
        matched_d   = {m[0] for m in matched}
        matched_t   = {m[1] for m in matched}
        unmatched_d = [d for d in range(len(dets)) if d not in matched_d]
        unmatched_t = [t for t in range(len(trks)) if t not in matched_t]
        return matched, unmatched_d, unmatched_t


# ══════════════════════════════════════════════════════════════
#  4. BEHAVIOR WINDOW ANALYZER
#     Collects frame-level features over a rolling 3-5 second
#     window and classifies driving patterns.
#
#  Usage:
#     bwa = BehaviorWindow(fps=30, window_sec=4)
#     pattern = bwa.update(speed_kmh, lane_dev, dist_m, jerk)
#     # pattern: 'normal' | 'aggressive' | 'unsafe_follow' |
#     #           'erratic' | 'slow_cautious'
# ══════════════════════════════════════════════════════════════

@dataclass
class BehaviorSample:
    ts:        float
    speed_kmh: float
    lane_dev:  float    # 0..1 (0=perfect center)
    dist_m:    float    # meters to nearest vehicle ahead
    jerk:      float    # m/s³ equivalent
    light_ok:  bool
    sign_ok:   bool

class BehaviorPattern:
    NORMAL        = "normal"
    AGGRESSIVE    = "aggressive"
    UNSAFE_FOLLOW = "unsafe_follow"
    ERRATIC       = "erratic"
    SLOW_CAUTIOUS = "slow_cautious"
    INSUFFICIENT  = "insufficient_data"


class BehaviorWindow:
    """
    Rolling time-window behavior analyzer.
    Classifies the driver's pattern over the last N seconds.
    """

    # Thresholds for pattern detection
    SPEED_LIMIT_KMH   = 60.0   # adjust to road type
    SAFE_DIST_M       = 20.0   # minimum safe following distance
    CRITICAL_DIST_M   = 8.0    # dangerously close
    HARSH_JERK        = 3.5    # m/s³ — harsh braking/acceleration
    LANE_DEV_THRESHOLD= 0.25   # ratio

    def __init__(self, fps: float = 30.0, window_sec: float = 4.0):
        self.fps = fps
        self.window_sec = window_sec
        self._max_samples = int(fps * window_sec)
        self._buf: deque = deque(maxlen=self._max_samples)
        self._pattern_history: deque = deque(maxlen=30)

    def update(self,
               speed_kmh: float,
               lane_dev: float,
               dist_m: float,
               jerk: float,
               light_ok: bool = True,
               sign_ok: bool = True) -> Dict:
        now = time.time()
        self._buf.append(BehaviorSample(
            ts=now, speed_kmh=speed_kmh, lane_dev=lane_dev,
            dist_m=dist_m, jerk=jerk, light_ok=light_ok, sign_ok=sign_ok,
        ))
        if len(self._buf) < max(10, self._max_samples // 4):
            return {"pattern": BehaviorPattern.INSUFFICIENT,
                    "metrics": {}, "risk_level": "LOW"}

        metrics = self._compute_metrics()
        pattern = self._classify(metrics)
        risk    = self._risk_level(pattern, metrics)
        self._pattern_history.append(pattern)

        return {
            "pattern":    pattern,
            "metrics":    metrics,
            "risk_level": risk,
            "dominant":   self._dominant_pattern(),
        }

    def _compute_metrics(self) -> Dict:
        samples = list(self._buf)
        speeds  = [s.speed_kmh for s in samples]
        devs    = [s.lane_dev   for s in samples]
        dists   = [s.dist_m     for s in samples]
        jerks   = [abs(s.jerk)  for s in samples]

        return {
            "mean_speed_kmh":     float(np.mean(speeds)),
            "max_speed_kmh":      float(np.max(speeds)),
            "speed_std":          float(np.std(speeds)),
            "mean_lane_dev":      float(np.mean(devs)),
            "max_lane_dev":       float(np.max(devs)),
            "mean_dist_m":        float(np.mean(dists)),
            "min_dist_m":         float(np.min(dists)),
            "mean_jerk":          float(np.mean(jerks)),
            "max_jerk":           float(np.max(jerks)),
            "harsh_events":       int(sum(1 for j in jerks if j > self.HARSH_JERK)),
            "lane_violations":    int(sum(1 for d in devs if d > self.LANE_DEV_THRESHOLD)),
            "light_violations":   int(sum(1 for s in samples if not s.light_ok)),
            "sign_violations":    int(sum(1 for s in samples if not s.sign_ok)),
            "unsafe_follow_sec":  float(sum(
                1/self.fps for s in samples if s.dist_m < self.SAFE_DIST_M
            )),
        }

    def _classify(self, m: Dict) -> str:
        # Aggressive: high speed, high jerk, close following
        if (m["max_speed_kmh"] > self.SPEED_LIMIT_KMH * 1.20 or
                m["harsh_events"] >= 3 or
                m["min_dist_m"] < self.CRITICAL_DIST_M):
            return BehaviorPattern.AGGRESSIVE

        # Unsafe following
        if m["mean_dist_m"] < self.SAFE_DIST_M and m["mean_speed_kmh"] > 20:
            return BehaviorPattern.UNSAFE_FOLLOW

        # Erratic: high lane deviation + high jerk
        if m["mean_lane_dev"] > self.LANE_DEV_THRESHOLD and m["mean_jerk"] > 2.0:
            return BehaviorPattern.ERRATIC

        # Slow/cautious
        if m["mean_speed_kmh"] < 10 and m["mean_jerk"] < 0.5:
            return BehaviorPattern.SLOW_CAUTIOUS

        return BehaviorPattern.NORMAL

    @staticmethod
    def _risk_level(pattern: str, m: Dict) -> str:
        if pattern == BehaviorPattern.AGGRESSIVE:
            return "HIGH"
        if pattern in (BehaviorPattern.UNSAFE_FOLLOW, BehaviorPattern.ERRATIC):
            if m.get("min_dist_m", 999) < 5.0 or m.get("harsh_events", 0) >= 5:
                return "CRITICAL"
            return "HIGH"
        if pattern != BehaviorPattern.NORMAL:
            return "MEDIUM"
        return "LOW"

    def _dominant_pattern(self) -> str:
        if not self._pattern_history:
            return BehaviorPattern.INSUFFICIENT
        from collections import Counter
        return Counter(self._pattern_history).most_common(1)[0][0]


# ══════════════════════════════════════════════════════════════
#  5. ML RISK SCORER
#     Replaces pure if-statement scoring with a weighted
#     feature-fusion model that outputs:
#       - driving_quality_score (0..100)
#       - risk_score (0..100, higher = more dangerous)
#       - confidence per criterion
#
#  Model: lightweight sklearn RandomForest trained on
#         synthetic feature distributions matching real
#         driving evaluation rubrics.
#         (You can retrain with real data — interface is the same.)
# ══════════════════════════════════════════════════════════════

class MLRiskScorer:
    """
    Weighted multi-criteria risk scorer with adaptive thresholds.
    Uses a RandomForest trained on synthetically generated data
    that mirrors official driving test rubrics.

    Input features (11 total):
        speed_ratio       — speed / speed_limit (0..2+)
        dist_ratio        — dist_m / safe_dist_m (0..5+)
        lane_dev          — 0..1
        jerk_norm         — 0..1
        light_compliance  — 0..1
        sign_compliance   — 0..1
        ped_yield         — 0..1
        bump_compliance   — 0..1
        stop_compliance   — 0..1
        intersection_ok   — 0..1
        smooth_ratio      — 0..1

    Output:
        quality_score     — 0..100
        risk_score        — 0..100
        risk_label        — LOW/MEDIUM/HIGH/CRITICAL
        feature_weights   — contribution of each feature
    """

    FEATURE_NAMES = [
        "speed_ratio", "dist_ratio", "lane_dev", "jerk_norm",
        "light_compliance", "sign_compliance", "ped_yield",
        "bump_compliance", "stop_compliance", "intersection_ok",
        "smooth_ratio",
    ]

    # Weights for quality score (must sum to 1.0)
    QUALITY_WEIGHTS = np.array([
        0.15,   # speed
        0.15,   # distance
        0.15,   # lane
        0.10,   # jerk/smooth
        0.12,   # light
        0.08,   # signs
        0.10,   # pedestrian
        0.05,   # bump
        0.05,   # stop
        0.05,   # intersection
    ])  # Note: 10 features for quality (smooth absorbed into jerk)

    def __init__(self):
        self._model = None
        self._feature_history: deque = deque(maxlen=60)
        self._build_model()

    def _build_model(self):
        """
        Trains a RandomForest on synthetic data.
        Replace this with your own training data for production.
        """
        try:
            from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
            from sklearn.preprocessing import StandardScaler

            rng = np.random.RandomState(42)
            n = 5000

            # Synthetic feature generation
            feats = np.column_stack([
                rng.beta(2, 3, n),           # speed_ratio: mostly under limit
                rng.beta(3, 2, n) * 3,        # dist_ratio
                rng.beta(1.5, 5, n),          # lane_dev
                rng.beta(1.5, 5, n),          # jerk_norm
                rng.binomial(1, 0.85, n).astype(float),  # light_compliance
                rng.binomial(1, 0.90, n).astype(float),  # sign_compliance
                rng.binomial(1, 0.88, n).astype(float),  # ped_yield
                rng.binomial(1, 0.92, n).astype(float),  # bump_compliance
                rng.binomial(1, 0.80, n).astype(float),  # stop_compliance
                rng.binomial(1, 0.85, n).astype(float),  # intersection_ok
                rng.beta(4, 2, n),            # smooth_ratio
            ])

            # Quality score: weighted sum (0..100)
            # Map features to quality contribution
            quality_raw = (
                (1.0 - np.clip(feats[:,0], 0, 1)) * self.QUALITY_WEIGHTS[0] +
                np.clip(feats[:,1] / 3.0, 0, 1)   * self.QUALITY_WEIGHTS[1] +
                (1.0 - feats[:,2])                  * self.QUALITY_WEIGHTS[2] +
                (1.0 - feats[:,3])                  * self.QUALITY_WEIGHTS[3] +
                feats[:,4]                           * self.QUALITY_WEIGHTS[4] +
                feats[:,5]                           * self.QUALITY_WEIGHTS[5] +
                feats[:,6]                           * self.QUALITY_WEIGHTS[6] +
                feats[:,7]                           * self.QUALITY_WEIGHTS[7] +
                feats[:,8]                           * self.QUALITY_WEIGHTS[8] +
                feats[:,9]                           * self.QUALITY_WEIGHTS[9]
            )
            quality_labels = np.clip(quality_raw * 100, 0, 100)

            # Risk label (0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL)
            risk_raw = (
                np.clip(feats[:,0] - 0.8, 0, None) * 3 +
                np.clip(1.0 - feats[:,1]/2, 0, None) * 2 +
                feats[:,2] * 1.5 +
                feats[:,3] * 1.0 +
                (1 - feats[:,4]) * 2.5 +
                (1 - feats[:,5]) * 1.5
            )
            risk_labels = np.clip(
                (risk_raw / risk_raw.max() * 3.99).astype(int), 0, 3
            )

            scaler = StandardScaler()
            feats_scaled = scaler.fit_transform(feats)

            clf = RandomForestClassifier(
                n_estimators=100, max_depth=8,
                random_state=42, n_jobs=-1
            )
            clf.fit(feats_scaled, risk_labels)

            reg = RandomForestRegressor(
                n_estimators=100, max_depth=8,
                random_state=42, n_jobs=-1
            )
            reg.fit(feats_scaled, quality_labels)

            self._model = {"clf": clf, "reg": reg,
                           "scaler": scaler, "trained": True}
            print("[MLRiskScorer] Model trained and ready.")
        except ImportError:
            print("[MLRiskScorer] scikit-learn not found. Using fallback scorer.")
            self._model = {"trained": False}

    def score(self,
              speed_kmh: float,
              speed_limit_kmh: float,
              dist_m: float,
              safe_dist_m: float,
              lane_dev: float,
              jerk: float,
              light_ok: float,
              sign_ok: float,
              ped_ok: float,
              bump_ok: float,
              stop_ok: float,
              intersection_ok: float,
              smooth: float) -> Dict:
        """
        All compliance values: 0.0 (failed) to 1.0 (perfect).
        Continuous values are also accepted (partial credit).

        Returns:
            quality_score  — 0..100
            risk_score     — 0..100
            risk_label     — LOW / MEDIUM / HIGH / CRITICAL
            feature_contribs — dict of per-feature contribution
        """
        speed_ratio = speed_kmh / max(speed_limit_kmh, 1.0)
        dist_ratio  = dist_m    / max(safe_dist_m, 1.0)
        jerk_norm   = min(jerk / 5.0, 1.0)     # normalize to 0..1

        feat = np.array([[
            speed_ratio, dist_ratio, lane_dev, jerk_norm,
            light_ok, sign_ok, ped_ok, bump_ok, stop_ok,
            intersection_ok, smooth,
        ]])

        self._feature_history.append(feat[0])

        if self._model and self._model.get("trained"):
            feat_s = self._model["scaler"].transform(feat)
            risk_idx    = int(self._model["clf"].predict(feat_s)[0])
            quality     = float(self._model["reg"].predict(feat_s)[0])
            risk_probs  = self._model["clf"].predict_proba(feat_s)[0]
            importances = self._model["clf"].feature_importances_
        else:
            # Fallback: weighted arithmetic
            risk_idx  = self._fallback_risk(feat[0])
            quality   = self._fallback_quality(feat[0])
            risk_probs  = [0.25]*4
            importances = self.QUALITY_WEIGHTS

        risk_labels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        risk_score  = float(risk_idx / 3.0 * 100.0)

        contribs = {
            name: float(importances[i] * 100)
            for i, name in enumerate(self.FEATURE_NAMES)
        }

        # Rolling average for stability
        if len(self._feature_history) >= 5:
            arr = np.array(list(self._feature_history)[-5:])
            quality = float(np.mean([
                self._model["reg"].predict(
                    self._model["scaler"].transform(r.reshape(1,-1))
                )[0]
                for r in arr
            ])) if self._model.get("trained") else quality

        return {
            "quality_score":    round(min(100.0, max(0.0, quality)), 1),
            "risk_score":       round(risk_score, 1),
            "risk_label":       risk_labels[risk_idx],
            "risk_probs":       {l: round(float(p)*100,1)
                                 for l,p in zip(risk_labels, risk_probs)},
            "feature_contribs": contribs,
        }

    @staticmethod
    def _fallback_risk(feat: np.ndarray) -> int:
        score = 0
        if feat[0] > 1.2: score += 2
        if feat[1] < 0.5: score += 2
        if feat[2] > 0.3: score += 1
        if feat[4] < 0.5: score += 2
        return min(3, score // 2)

    @staticmethod
    def _fallback_quality(feat: np.ndarray) -> float:
        weights = np.array([0.15,0.15,0.15,0.10,0.12,0.08,0.10,0.05,0.05,0.05])
        values  = np.array([
            1-min(feat[0],1), min(feat[1]/3,1), 1-feat[2],
            1-feat[3], feat[4], feat[5], feat[6], feat[7], feat[8], feat[9]
        ])
        return float(np.dot(weights, values) * 100)


# ══════════════════════════════════════════════════════════════
#  6. REPORT GENERATOR
#     Creates a structured PDF report at the end of session.
#
#  Usage:
#     rg = ReportGenerator()
#     rg.add_frame_result(frame_data_dict)
#     rg.save("report.pdf", final_scores)
# ══════════════════════════════════════════════════════════════

class ReportGenerator:
    """
    Generates a professional PDF driving evaluation report.
    Requires: pip install fpdf2
    """

    def __init__(self):
        self._events: List[Dict] = []
        self._frame_count = 0
        self._start_time = time.time()

    def log_event(self, event: Dict):
        """Log a significant driving event for the report."""
        self._events.append({
            "ts":    time.time() - self._start_time,
            "frame": self._frame_count,
            **event,
        })

    def tick(self):
        self._frame_count += 1

    def save(self,
             path: str,
             bucket_scores: Dict,
             ml_result: Dict,
             behavior_summary: Dict,
             metadata: Optional[Dict] = None):
        try:
            from fpdf import FPDF
        except ImportError:
            print("[Report] fpdf2 not found. Run: pip install fpdf2")
            self._save_txt(path, bucket_scores, ml_result, behavior_summary)
            return

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(0, 12, "Driving Evaluation Report", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)

        duration_s = time.time() - self._start_time
        m, s = divmod(int(duration_s), 60)
        pdf.cell(0, 8, f"Duration: {m}m {s}s  |  Frames: {self._frame_count}", ln=True, align="C")
        if metadata:
            for k, v in metadata.items():
                pdf.cell(0, 7, f"{k}: {v}", ln=True, align="C")
        pdf.ln(4)

        # Score table
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 9, "Criterion Scores", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_fill_color(240, 240, 240)

        col_w = [70, 25, 25, 55]
        headers = ["Criterion", "Score", "Max", "Performance"]
        pdf.set_font("Helvetica", "B", 10)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 8, h, border=1, fill=True)
        pdf.ln()

        pdf.set_font("Helvetica", "", 10)
        for key, val in bucket_scores.items():
            perf = "Excellent" if val["ratio"] >= 0.9 else \
                   "Good"      if val["ratio"] >= 0.75 else \
                   "Fair"      if val["ratio"] >= 0.55 else "Poor"
            pdf.cell(col_w[0], 7, val["name"], border=1)
            pdf.cell(col_w[1], 7, str(val["score"]), border=1, align="C")
            pdf.cell(col_w[2], 7, str(val["maximum"]), border=1, align="C")
            pdf.cell(col_w[3], 7, perf, border=1)
            pdf.ln()

        pdf.ln(4)

        # ML assessment
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 9, "AI Risk Assessment", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 7, f"Driving Quality Score: {ml_result.get('quality_score', 'N/A')}/100", ln=True)
        pdf.cell(0, 7, f"Risk Level: {ml_result.get('risk_label', 'N/A')}", ln=True)

        # Behavior
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 9, "Behavioral Analysis (Rolling Window)", ln=True)
        pdf.set_font("Helvetica", "", 10)
        dom = behavior_summary.get("dominant", "N/A")
        pdf.cell(0, 7, f"Dominant pattern: {dom}", ln=True)
        for k, v in behavior_summary.get("metrics", {}).items():
            if isinstance(v, float):
                pdf.cell(0, 6, f"  {k}: {v:.2f}", ln=True)
            else:
                pdf.cell(0, 6, f"  {k}: {v}", ln=True)

        # Events
        if self._events:
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 9, "Significant Events", ln=True)
            pdf.set_font("Helvetica", "", 9)
            for ev in self._events[-30:]:   # last 30 events
                ts_str = f"{ev['ts']:.1f}s"
                label  = ev.get("label", "event")
                kind   = ev.get("kind", "")
                pdf.cell(0, 6, f"  [{ts_str}] {kind} — {label}", ln=True)

        pdf.output(path)
        print(f"[Report] Saved: {path}")

    def _save_txt(self, path, buckets, ml, behavior):
        txt_path = path.replace(".pdf", ".txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("DRIVING EVALUATION REPORT\n")
            f.write("="*50 + "\n")
            for k, v in buckets.items():
                f.write(f"  {v['name']}: {v['score']}/{v['maximum']}\n")
            f.write(f"\nQuality: {ml.get('quality_score')}/100\n")
            f.write(f"Risk: {ml.get('risk_label')}\n")
            f.write(f"Pattern: {behavior.get('dominant')}\n")
        print(f"[Report] Saved as text: {txt_path}")