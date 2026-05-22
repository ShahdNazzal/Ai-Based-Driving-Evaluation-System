"use client";




{/*C:\Users\lenovo\Desktop\Drive-Skills-main\Drive-Skills-main\components\driving-game.tsx */}

import React, { useRef, useState, useEffect } from "react";

interface PathPoint {
  time: number; // وقت النقطة بالثواني
  x: string;
  y: string;
}

interface Marker {
  start: number;
  end: number;
  label: string;
  path: PathPoint[]; // مسار الحركة
}

export default function DrivingGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleMarkers, setVisibleMarkers] = useState<Marker[]>([]);
  const [tooltip, setTooltip] = useState<{ x: string; y: string; text: string } | null>(null);

  // 🔴 تعريف الإشارات ومساراتها (مثال)
  const markers: Marker[] = [
    {
      start: 1,
      end: 3.5,
      label: "انعطاف اجباري نحو اليمين",
      path: [
        { time: 1, x: "58%", y: "68%" },
        { time: 2, x: "57.8%", y: "68%" },
        { time: 3, x: "53.8%", y: "69%" },
        { time: 4, x: "47.80%", y: "73%" },
        
      ],
    },
    {
      start: 8,
      end: 10,
      label: "إشارة مرور قادمة",
      path: [
        { time: 8, x: "59%", y: "65%" },
        { time: 9, x: "61%", y: "63%" },
        { time: 10, x: "70%", y: "60%" },
      ],
    },
  ];

  // ⏱ مراقبة الوقت
  useEffect(() => {
    let interval: number;

    if (isPlaying) {
      interval = window.setInterval(() => {
        if (!videoRef.current) return;
        const t = videoRef.current.currentTime;
        const active = markers.filter((m) => t >= m.start && t <= m.end);
        setVisibleMarkers(active);
      }, 100);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying]);

  const handleStart = () => {
    setIsPlaying(true);
    videoRef.current?.play();
  };

  const handleMarkerClick = (marker: Marker) => {
    const current = videoRef.current?.currentTime ?? 0;
    const closest = marker.path.reduce((prev, curr) =>
      Math.abs(curr.time - current) < Math.abs(prev.time - current) ? curr : prev
    );
    setTooltip({ x: closest.x, y: closest.y, text: marker.label });
    setTimeout(() => setTooltip(null), 3000);
  };

  // 🔁 حساب موقع كل دائرة حسب الوقت الحالي
  const getMarkerPosition = (marker: Marker) => {
    if (!videoRef.current) return { x: "0%", y: "0%" };
    const current = videoRef.current.currentTime;

    // ابحث عن نقطتين حول الزمن الحالي
    const before = marker.path
      .filter((p) => p.time <= current)
      .sort((a, b) => b.time - a.time)[0];
    const after = marker.path
      .filter((p) => p.time >= current)
      .sort((a, b) => a.time - b.time)[0];

    if (!before) return after || marker.path[0];
    if (!after) return before || marker.path[marker.path.length - 1];

    // ⚙️ interpolate (انتقال تدريجي)
    const ratio =
      (current - before.time) / (after.time - before.time || 1);
    const interpolate = (a: string, b: string) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return `${aNum + (bNum - aNum) * ratio}%`;
    };

    return { x: interpolate(before.x, after.x), y: interpolate(before.y, after.y) };
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {!isPlaying && (
        <button
          onClick={handleStart}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg mb-4 text-xl"
        >
          Start
        </button>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain rounded-xl"
        src="/videos/driverskills.mp4"
        muted
        controls={isPlaying}
        preload="auto"
        playsInline
        controlsList="nodownload noremoteplayback"
      />

      {/* 🔴 الدوائر (مفتوحة وتتحرك حسب الزمن) */}
      {visibleMarkers.map((marker, index) => {
        const pos = getMarkerPosition(marker);
        return (
          <div
  key={index}
  onClick={() => handleMarkerClick(marker)}
  className="absolute border-4 border-red-500 rounded-full cursor-pointer hover:scale-105 transition-transform duration-200"
  style={{
    top: pos.y,
    left: pos.x,
    width: "50px", // 🔹 حجم أصغر قليلاً
    height: "50px", // 🔹 حجم أصغر قليلاً
    transform: "translate(-50%, -50%)",
  }}
/>

        );
      })}

      {tooltip && (
        <div
          className="absolute bg-white text-black px-3 py-2 rounded-lg shadow-md text-lg font-medium"
          style={{
            top: `calc(${tooltip.y} - 50px)`,
            left: tooltip.x,
            transform: "translate(-50%, -50%)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
