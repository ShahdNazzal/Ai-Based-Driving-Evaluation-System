"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";

// --- Types ---
type Mistake = {
  n: string;
  d: string;
  t: string;
};

type Sign = {
  title: string;
  img: string;
};

// --- Common Mistakes ---
const mistakes: Mistake[] = [
  {
    n: "Not checking mirrors before any movement",
    d: "Forgetting to check the mirrors before changing lanes, stopping, or turning.",
    t: "Check your mirrors continuously before and while driving"
  },
  {
    n: "Not signaling before changing direction",
    d: "Moving the car without turning on the indicator, or turning it on too late.",
    t: "Turn on the signal a few seconds before moving"
  },
  {
    n: "Not coming to a complete stop at a stop sign",
    d: "Failing to bring the car to a full stop at a stop sign.",
    t: "Stop completely and count 2–3 seconds before continuing"
  },
  {
    n: "Entering a roundabout incorrectly",
    d: "Entering too fast or without giving priority to cars already inside the roundabout.",
    t: "Slow down and only enter when it is safe"
  },
  {
    n: "Not keeping a sufficient safety distance",
    d: "Getting too close to the car in front while driving.",
    t: "Maintain a distance of at least 2–3 seconds"
  },
  {
    n: "Changing lanes suddenly",
    d: "Moving between lanes without signaling or without checking the road is clear.",
    t: "Turn on the signal and make sure the lane is clear before changing"
  },
  {
    n: "Inappropriate speed for the road",
    d: "Driving faster or slower than the allowed limit.",
    t: "Follow the speed shown on signs and signals"
  },
  {
    n: "Not staying in the correct lane",
    d: "Drifting out of the lane in a disorganized way while driving.",
    t: "Keep your lane and only change it when necessary"
  },
  {
    n: "Sudden braking without reason",
    d: "Stopping abruptly in a way that endangers vehicles behind you.",
    t: "Reduce speed gradually before stopping"
  },
  {
    n: "Forgetting to turn off the indicator after turning",
    d: "Leaving the signal on after completing the turn.",
    t: "Make sure to turn off the indicator after every turn"
  },
  {
    n: "Poor steering wheel control",
    d: "Turning the steering wheel incorrectly or unsteadily during turns.",
    t: "Use the steady 9 and 3 hand position"
  },
  {
    n: "Nervousness during the practical exam",
    d: "Becoming anxious and losing focus during the driving test.",
    t: "Breathe calmly and focus on each step before performing it"
  }
];

// --- ALL TRAFFIC SIGNS ---
const signs: Sign[] = [
  {
    title: "Priority of Way on a Narrow Street",
    img: "/شواخص/افضلية_المرور_في_الشارع_الضيق.png",
  },
  {
    title: "Informative Signs",
    img: "/شواخص/الشواخص_الارشادية.png",
  },
  {
    title: "Informative Signs",
    img: "/شواخص/الشواخص_الارشادية2.png",
  },
  {
    title: "Informative Signs",
    img: "/شواخص/الشواخص_الارشادية3.png",
  },
  {
    title: "Mandatory Signs",
    img: "/شواخص/الشواخص_الالزامية.png",
  },
  {
    title: "Mandatory Signs",
    img: "/شواخص/الشواخص_الالزامية2.png",
  },
  {
    title: "Mandatory Signs",
    img: "/شواخص/الشواخص_الالزامية3.png",
  },
  {
    title: "Warning Signs",
    img: "/شواخص/الشواخص_التحذيرية.png",
  },
  {
    title: "Warning Signs",
    img: "/شواخص/الشواخص_التحذيرية2.png",
  },
  {
    title: "Warning Signs",
    img: "/شواخص/الشواخص_التحذيرية3.png",
  },
  {
    title: "Tourist Signs",
    img: "/شواخص/الشواخص_السياحية.png",
  },
  {
    title: "Traffic Flow Regulation",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور4.png",
  },
  {
    title: "Tourist Signs",
    img: "/شواخص/الشواخص_السياحية2.png",
  },
  {
    title: "End of Restricted Zone",
    img: "/شواخص/انتهاء_منطقة_المنع.png",
  },
  {
    title: " ",
    img: "/شواخص/ش1.png",
  },
  {
    title: " ",
    img: "/شواخص/ش2.png",
  },
  {
    title: " ",
    img: "/شواخص/ش3.png",
  },
  {
    title: " ",
    img: "/شواخص/ش4.png",
  },
  {
    title: " ",
    img: "/شواخص/ش5.png",
  },
  {
    title: " ",
    img: "/شواخص/ش6.png",
  },
  {
    title: " ",
    img: "/شواخص/ش7.png",
  },
  {
    title: " ",
    img: "/شواخص/ش8.png",
  },
  {
    title: " ",
    img: "/شواخص/ش9.png",
  },
  {
    title: " ",
    img: "/شواخص/ش10.png",
  },
  {
    title: " ",
    img: "/شواخص/ش11.png",
  },
  {
    title: " ",
    img: "/شواخص/ش12.png",
  },
  {
    title: " ",
    img: "/شواخص/ش13.png",
  },
  {
    title: " ",
    img: "/شواخص/ش14.png",
  },
  {
    title: " ",
    img: "/شواخص/ش15.png",
  },
  {
    title: " ",
    img: "/شواخص/ش16.png",
  },
  {
    title: " ",
    img: "/شواخص/ش17.png",
  },
  {
    title: " ",
    img: "/شواخص/ش18.png",
  },
  {
    title: " ",
    img: "/شواخص/ش19.png",
  },
  {
    title: " ",
    img: "/شواخص/ش20.png",
  },
  {
    title: " ",
    img: "/شواخص/ش21.png",
  },
  {
    title: " ",
    img: "/شواخص/ش22.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع1.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع2.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع3.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع4.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع5.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع6.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع7.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع8.png",
  },
  {
    title: "Prohibition Signs",
    img: "/شواخص/شواخص_المنع2.png",
  },
  {
    title: "Traffic Flow Regulation",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور2.png",
  },
  {
    title: "Traffic Flow Regulation",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور3.png",
  },
  {
    title: "No Stopping / No Parking",
    img: "/شواخص/شواخص_ممنواع_الوقوف_والتوقف.png",
  },
];

// --- Component ---
export default function BookPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ================= COMMON MISTAKES ================= */}
        <div className="mb-12">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-800">
                Common Mistakes
              </span>
              <span className="text-xs text-gray-400 ml-2">
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mistakes.map((m, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-red-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">{m.n}</h4>
                    <p className="text-xs text-gray-500 mb-3">{m.d}</p>
                    <div className="flex items-start gap-1.5 px-2 py-2 rounded-md bg-amber-50 border">
                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5" />
                      <span className="text-[11px] text-amber-700 font-medium">
                        {m.t}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= TRAFFIC SIGNS ================= */}
        <div>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              🚧
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-800">
                Traffic Signs
              </span>
              <span className="text-xs text-gray-400 ml-2">
                All signs in one place
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {signs.map((item, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded-xl border shadow-sm hover:shadow-md transition"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-40 object-contain mb-2"
                />
                <h4 className="text-xs font-semibold">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-10">

          {/* LEFT VIDEO */}
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300">

            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              🎥 Learning Series with Trainer Raad Awad
            </h2>

            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md border border-gray-100">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-20 blur-xl"></div>

              <iframe
                className="relative w-full h-full rounded-xl"
                src="https://www.youtube.com/embed/xj8eQniMJJw"
                title="Driving Lesson"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Step-by-step explanation of driving basics 🚗
            </p>
          </div>

          {/* RIGHT VIDEO */}
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300">

            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              🚗 Learn How to Park a Car
            </h2>

            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md border border-gray-100">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-20 blur-xl"></div>

              <iframe
                className="relative w-full h-full rounded-xl"
                src="https://www.youtube.com/embed/9lYZ0G4QTI8"
                title="Car Parking Lesson"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <p className="text-xs text-gray-500 mt-3">
              A practical guide to parking your car safely and easily 🅿️
            </p>
          </div>

        </div>

        {/* ================= COPYRIGHT FOOTER ================= */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            All rights reserved to Trainer Fadi Awad. The information provided is verified and was supplied by the trainer. Contact: +962799621717
          </p>
        </div>

      </div>
    </div>
  );
}