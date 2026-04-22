"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home,
  ChevronRight,
  Play,
  RotateCcw,
  Gauge,
  CircleDot,
  CarFront,
  ShieldAlert,
  Eye,
  Waypoints,
  Minus,
  Users,
  Hand,
  TriangleAlert,
} from "lucide-react";

// --- Types ---
type CategoryKey =
  | "potholes"
  | "lane_keeping"
  | "car_positioning"
  | "signs"
  | "awareness"
  | "intersections"
  | "following_distance"
  | "pedestrians"
  | "stopping"
  | "obstacles";

interface Obstacle {
  id: number;
  type: CategoryKey;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  color: string;
  passed: boolean;
  failed: boolean;
  isStopZone?: boolean;
  isRedLight?: boolean;
}

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface GameState {
  player: Player;
  obstacles: Obstacle[];
  distance: number;
  roadOffset: number;
  nextEventDistance: number;
  offRoadTime: number;
  edgeTime: number;
  windActive: boolean;
  windTimer: number;
  windDir: number;
}

type ScoreState = Record<CategoryKey, number>;
type GamePhase = "idle" | "playing" | "finished";

const INITIAL_SCORES: ScoreState = {
  potholes: 10,
  lane_keeping: 12,
  car_positioning: 8,
  signs: 10,
  awareness: 8,
  intersections: 7,
  following_distance: 12,
  pedestrians: 13,
  stopping: 10,
  obstacles: 10,
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  potholes: "Dealing with potholes",
  lane_keeping: "Lane keeping",
  car_positioning: "Car positioning",
  signs: "Traffic signs",
  awareness: "Traffic awareness",
  intersections: "Intersections",
  following_distance: "Following distance",
  pedestrians: "Pedestrian interaction",
  stopping: "Emergency stopping",
  obstacles: "Obstacle handling",
};

const CATEGORY_ICONS: Record<CategoryKey, React.ComponentType<{ className?: string }>> = {
  potholes: CircleDot,
  lane_keeping: CarFront,
  car_positioning: CarFront,
  signs: ShieldAlert,
  awareness: Eye,
  intersections: Waypoints,
  following_distance: Minus,
  pedestrians: Users,
  stopping: Hand,
  obstacles: TriangleAlert,
};

// Increased from 3200 to 15000 for a much longer game
const TARGET_DISTANCE = 15000; 

const EVENT_CATEGORIES: CategoryKey[] = [
  "potholes",
  "following_distance",
  "signs",
  "intersections",
  "obstacles",
  "pedestrians",
  "awareness",
  "car_positioning",
  "lane_keeping",
];

const DEFAULT_STATE: GameState = {
  player: { x: 0, y: 0, w: 40, h: 70, speed: 0 },
  obstacles: [],
  distance: 0,
  roadOffset: 0,
  nextEventDistance: 600, // First event happens after 600m
  offRoadTime: 0,
  edgeTime: 0,
  windActive: false,
  windTimer: 0,
  windDir: 0,
};

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const keysRef = useRef(new Set<string>());
  const stateRef = useRef<GameState>(structuredClone(DEFAULT_STATE));

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [scores, setScores] = useState<ScoreState>(structuredClone(INITIAL_SCORES));
  const [distance, setDistance] = useState(0);
  const scoresRef = useRef<ScoreState>(structuredClone(INITIAL_SCORES));

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const triggerFail = useCallback((category: CategoryKey) => {
    if (scoresRef.current[category] > 0) {
      const next = { ...scoresRef.current, [category]: 0 };
      scoresRef.current = next;
      setScores(next);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);

      const w = rect.width;
      const laneW = w / 3;
      stateRef.current.player.x = laneW - 20;
      stateRef.current.player.y = rect.height - 120;
    };
    resize();
    window.addEventListener("resize", resize);

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3);
      lastTime = time;

      const gs = stateRef.current;
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      const laneW = w / 3;
      const p = gs.player;

      // --- Draw background ---
      ctx.fillStyle = "#374151";
      ctx.fillRect(0, 0, w, h);

      // Road lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      // Tweak: Slowed down visual road scrolling slightly to match new pacing
      ctx.lineDashOffset = -gs.roadOffset; 
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Edge lines
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1, 0); ctx.lineTo(1, h);
      ctx.moveTo(w - 1, 0); ctx.lineTo(w - 1, h);
      ctx.stroke();

      // --- Update game state ---
      if (phase === "playing") {
        // Input physics
        if (keysRef.current.has("ArrowUp"))
          p.speed = Math.min(p.speed + 0.15, 6);
        else if (keysRef.current.has(" ") || keysRef.current.has("ArrowDown"))
          p.speed = Math.max(p.speed - 0.3, 0);
        else p.speed = Math.min(p.speed + 0.03, 4); // Slower natural cruise speed

        if (keysRef.current.has("ArrowLeft")) p.x -= 3.5 * dt;
        if (keysRef.current.has("ArrowRight")) p.x += 3.5 * dt;

        p.x = Math.max(10, Math.min(w - p.w - 10, p.x));

        // Tweak: Slowed down distance and road offset calculation for a longer game
        const visualSpeed = p.speed * dt * 1.2; 
        const distanceSpeed = p.speed * dt * 0.4; // Takes much longer to reach 15000

        gs.roadOffset = (gs.roadOffset + visualSpeed) % 40;
        gs.distance += distanceSpeed;
        setDistance(Math.floor(gs.distance));

        // Off-road / edge tracking
        const offRoad = p.x < 12 || p.x + p.w > w - 12;
        const onEdge = p.x < 24 || p.x + p.w > w - 24;

        if (offRoad) {
          gs.offRoadTime += dt;
          if (gs.offRoadTime > 30) triggerFail("lane_keeping");
        } else {
          gs.offRoadTime = Math.max(0, gs.offRoadTime - dt * 0.5);
        }

        if (onEdge && !offRoad) {
          gs.edgeTime += dt;
          if (gs.edgeTime > 60) triggerFail("car_positioning");
        } else {
          gs.edgeTime = Math.max(0, gs.edgeTime - dt * 0.5);
        }

        // Wind effect
        if (gs.windActive) {
          p.x += gs.windDir * 0.6 * dt;
          gs.windTimer += dt;
          if (gs.windTimer > 150) gs.windActive = false;
        }

        // --- Dynamic Random Event Spawning ---
        if (gs.distance >= gs.nextEventDistance) {
          // Pick a random category instead of a fixed queue
          const evType = EVENT_CATEGORIES[Math.floor(Math.random() * EVENT_CATEGORIES.length)];
          const spawned: Obstacle[] = [];
          const lane = Math.floor(Math.random() * 3);
          const lx = lane * laneW + (laneW - 40) / 2;

          switch (evType) {
            case "potholes":
              spawned.push({ id: Date.now(), type: evType, x: lx, y: -100, w: 40, h: 40, speed: 0, color: "#1f2937", passed: false, failed: false });
              break;
            case "following_distance":
              spawned.push({ id: Date.now(), type: evType, x: lx, y: -150, w: 40, h: 70, speed: 2, color: "#ef4444", passed: false, failed: false });
              break;
            case "signs":
              spawned.push({ id: Date.now(), type: evType, x: w - 60, y: -100, w: 40, h: 80, speed: 0, color: "#dc2626", passed: false, failed: false, isStopZone: true });
              break;
            case "intersections":
              spawned.push({ id: Date.now(), type: evType, x: w / 2 - 30, y: -120, w: 60, h: 20, speed: 0, color: "#ef4444", passed: false, failed: false, isRedLight: true });
              break;
            case "obstacles":
              spawned.push({ id: Date.now(), type: evType, x: lx, y: -100, w: 50, h: 50, speed: 0, color: "#f97316", passed: false, failed: false });
              break;
            case "pedestrians": {
              const dir = Math.random() > 0.5 ? 1 : -1;
              spawned.push({ id: Date.now(), type: evType, x: dir > 0 ? -20 : w + 20, y: h / 2 - 30, w: 20, h: 20, speed: dir * 2, color: "#8b5cf6", passed: false, failed: false });
              break;
            }
            case "awareness":
              spawned.push({ id: Date.now(), type: evType, x: lx, y: -200, w: 40, h: 70, speed: 3.5, color: "#3b82f6", passed: false, failed: false });
              spawned.push({ id: Date.now() + 1, type: "stopping", x: lx, y: -320, w: 40, h: 70, speed: 0, color: "#3b82f6", passed: false, failed: false });
              break;
            case "car_positioning":
              spawned.push({ id: Date.now(), type: evType, x: 12, y: -150, w: laneW - 24, h: 100, speed: 0, color: "#6b7280", passed: false, failed: false });
              spawned.push({ id: Date.now() + 1, type: evType, x: 2 * laneW + 12, y: -150, w: laneW - 24, h: 100, speed: 0, color: "#6b7280", passed: false, failed: false });
              break;
            case "lane_keeping":
              gs.windActive = true;
              gs.windTimer = 0;
              gs.windDir = Math.random() > 0.5 ? 1 : -1;
              break;
          }

          gs.obstacles.push(...spawned);
          
          // Tweak: Increased spacing between events (800m to 1200m apart)
          gs.nextEventDistance += 800 + Math.random() * 400; 
        }

        // --- Update & collide obstacles ---
        const kept: Obstacle[] = [];

        for (let i = 0; i < gs.obstacles.length; i++) {
          const obs = gs.obstacles[i];

          if (obs.type === "pedestrians") {
            obs.x += obs.speed * dt;
            if (obs.x < -60 || obs.x > w + 60) continue;
          } else {
            // Tweak: Use the new visual speed for obstacle scrolling consistency
            obs.y += visualSpeed - (obs.speed * dt); 
            if (obs.y > h + 120) {
              if (!obs.passed && !obs.failed) {
                if (obs.isStopZone && p.speed > 0.5) triggerFail("signs");
                if (obs.isRedLight && p.speed > 0.5) triggerFail("intersections");
              }
              continue;
            }
          }

          const hit =
            p.x < obs.x + obs.w &&
            p.x + p.w > obs.x &&
            p.y < obs.y + obs.h &&
            p.y + p.h > obs.y;

          if (hit && !obs.failed) {
            obs.failed = true;
            if (obs.type === "awareness") {
              triggerFail("awareness");
              triggerFail("stopping");
            } else {
              triggerFail(obs.type);
            }
          }

          kept.push(obs);
        }

        gs.obstacles = kept;

        if (gs.distance >= TARGET_DISTANCE) {
          setPhase("finished");
        }
      }

      // --- Draw obstacles ---
      for (let i = 0; i < gs.obstacles.length; i++) {
        const obs = gs.obstacles[i];
        ctx.fillStyle = obs.color;

        if (obs.type === "potholes") {
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, obs.h / 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === "pedestrians") {
          ctx.beginPath();
          ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🚶", obs.x + obs.w / 2, obs.y + obs.h / 2 + 4);
        } else if (obs.isStopZone) {
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("STOP", obs.x + obs.w / 2, obs.y + obs.h / 2 + 4);
        } else if (obs.isRedLight) {
          ctx.fillRect(0, obs.y, w, obs.h);
          ctx.fillStyle = obs.failed ? "#ff000080" : "#ffffff";
          ctx.font = "bold 13px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(obs.failed ? "✗ FAILED" : "RED LIGHT — BRAKE", w / 2, obs.y + 14);
        } else {
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
          ctx.fill();
          if (obs.failed) {
            ctx.fillStyle = "#ffffffcc";
            ctx.font = "bold 9px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("FAIL", obs.x + obs.w / 2, obs.y + obs.h / 2 + 3);
          }
        }
      }

      // --- Draw player ---
      ctx.fillStyle = p.speed === 0 ? "#f59e0b" : "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 8);
      ctx.fill();

      // Wind indicator
      if (gs.windActive) {
        ctx.fillStyle = "#ffffff50";
        ctx.font = "bold 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`💨 WIND ${gs.windDir > 0 ? "→→" : "←←"}`, w / 2, h / 2);
      }

      // Speed on car
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(p.speed * 20)}`, p.x + p.w / 2, p.y + p.h / 2 + 3);

      // HUD
      ctx.fillStyle = "#00000090";
      ctx.beginPath();
      ctx.roundRect(10, 10, 180, 48, 8);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${Math.floor(gs.distance)}m / ${TARGET_DISTANCE}m`, 22, 32);

      // Progress bar in HUD
      ctx.fillStyle = "#ffffff30";
      ctx.beginPath();
      ctx.roundRect(22, 40, 156, 6, 3);
      ctx.fill();
      
      const progress = Math.min(gs.distance / TARGET_DISTANCE, 1);
      if (progress > 0) {
        ctx.fillStyle = "#818cf8";
        ctx.beginPath();
        ctx.roundRect(22, 40, 156 * progress, 6, 3);
        ctx.fill();
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, triggerFail]);

  const resetGame = () => {
    stateRef.current = structuredClone(DEFAULT_STATE);
    scoresRef.current = structuredClone(INITIAL_SCORES);
    setScores(structuredClone(INITIAL_SCORES));
    setDistance(0);
    setPhase("idle");
  };

  const startGame = () => {
    resetGame();
    requestAnimationFrame(() => setPhase("playing"));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* Breadcrumb */}
        

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Driving Simulator</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Endurance driving test. React to random hazards to keep your score.
            </p>
          </div>
          <button
            onClick={phase === "playing" ? resetGame : startGame}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 w-fit shadow-sm"
          >
            {phase === "playing" ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {phase === "playing" ? "Restart" : phase === "finished" ? "Play Again" : "Start Game"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="relative w-full aspect-[16/10] bg-gray-800 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
              <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: "auto" }} />

              {phase === "idle" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4 rounded-2xl">
                  <Gauge className="w-16 h-16 text-indigo-400" />
                  <h2 className="text-2xl font-bold">Ready to Drive?</h2>
                  <p className="text-sm text-white/60 max-w-sm text-center px-4">
                    Use <b>Arrow Keys</b> to steer and accelerate. <b>Spacebar</b> to brake.
                    <br />Reach <b>15,000m</b> to finish. Stay focused!
                  </p>
                </div>
              )}

              {phase === "finished" && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-white gap-3 rounded-2xl">
                  <div className="text-5xl font-extrabold text-indigo-400">{totalScore}/100</div>
                  <p className="text-lg font-semibold">Simulation Complete</p>
                  <p className="text-sm text-white/50">Check your breakdown on the right →</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-6 text-xs text-gray-500 flex-wrap">
              <span className="font-semibold text-gray-700">Controls:</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-[11px]">↑</kbd> Accelerate
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-[11px]">↓</kbd> / <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-[11px]">Space</kbd> Brake
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-[11px]">←</kbd>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-[11px]">→</kbd> Steer
              </div>
            </div>
          </div>

          {/* Scorecard */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Score</h3>
                <div className="text-xl font-extrabold text-indigo-600">
                  {totalScore}
                  <span className="text-sm text-gray-300 font-normal">/100</span>
                </div>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full mb-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((distance / TARGET_DISTANCE) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mb-6 text-right font-mono">
                {distance.toLocaleString()}m / {TARGET_DISTANCE.toLocaleString()}m
              </p>

              <div className="space-y-3">
                {(Object.keys(INITIAL_SCORES) as CategoryKey[]).map((key) => {
                  const val = scores[key];
                  const max = INITIAL_SCORES[key];
                  const isFailed = val === 0;
                  const Icon = CATEGORY_ICONS[key];

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 transition-colors ${isFailed ? "text-red-400" : "text-gray-400"}`} />
                          <span className={`text-[11px] font-medium leading-tight ${isFailed ? "text-red-500 line-through" : "text-gray-600"}`}>
                            {CATEGORY_LABELS[key]}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">{val}/{max}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isFailed ? "bg-red-400" : "bg-emerald-500"}`}
                          style={{ width: `${(val / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}