"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileCheck,
  AlertTriangle,
  Bot,
  Trophy,
  ChevronRight,
  ArrowUp,
  Lightbulb,
  Home,
} from "lucide-react";

// --- Types ---
type Message = {
  id: number;
  text: string;
  isUser: boolean;
};

type Question = {
  q: string;
  opts: string[];
  c: number;
  exp: string;
};

type Mistake = {
  n: string;
  d: string;
  t: string;
};

// --- Data ---
const questions: Question[] = [
  {
    q: "What is the speed limit in residential areas in Jordan?",
    opts: ["30 km/h", "40 km/h", "50 km/h", "60 km/h"],
    c: 1,
    exp: "Residential speed limit is 40 km/h unless otherwise posted.",
  },
  {
    q: "When approaching a roundabout, who has right of way?",
    opts: ["Vehicles entering", "Vehicles already inside", "Pedestrians only", "No one"],
    c: 1,
    exp: "Vehicles already in the roundabout always have priority.",
  },
  {
    q: "What does a flashing red light mean?",
    opts: ["Speed up", "Treat as stop sign", "Proceed carefully", "Turn around"],
    c: 1,
    exp: "Flashing red = stop sign. Stop completely, then proceed when safe.",
  },
  {
    q: "What's the minimum following distance at 80 km/h?",
    opts: ["1 second", "2 seconds", "3 seconds", "4 seconds"],
    c: 1,
    exp: "The 2-second rule applies at all speeds. Increase in bad weather.",
  },
  {
    q: "Which document is NOT required for the driving test?",
    opts: ["National ID", "Medical certificate", "Passport", "Learning permit"],
    c: 2,
    exp: "You need ID, learning permit, and medical certificate. Passport is not required.",
  },
];

const mistakes: Mistake[] = [
  { n: "Not Checking Mirrors", d: "Failing to check mirrors before signaling, changing direction, or slowing down.", t: "Check mirrors every 5–8 seconds" },
  { n: "Poor Steering Control", d: "Crossing hands, not maintaining lane position, or over-steering during maneuvers.", t: "Use push-pull method. Hands at 9 & 3" },
  { n: "Incorrect Signaling", d: "Forgetting to signal, signaling too late, or leaving indicators on.", t: "Signal before action, cancel after" },
  { n: "Speed Violations", d: "Exceeding limits or driving too slowly. Both can result in failure.", t: "Stay within 5 km/h of posted limit" },
  { n: "Rolling at Stop Signs", d: "Not coming to a complete stop. Wheels must fully stop moving.", t: "Count to 3 after stopping" },
  { n: "Nervous Stalling", d: "Stalling due to poor clutch control at intersections or roundabouts.", t: "If you stall: handbrake, neutral, restart" },
];

const aiResponses: Record<string, string> = {
  "speed limits in jordan?": "Here are the speed limits:\n\n🏠 Residential: 40 km/h\n🏙️ Urban: 60 km/h\n🛣️ Rural: 80 km/h\n🚀 Highway: 110 km/h\n\nAlways check posted signs — limits vary near schools and construction.",
  "how do i parallel park?": "Step-by-step:\n1. Pull up alongside front car, ~1m away\n2. Check mirrors & blind spots\n3. Reverse, turn wheel fully left when rears align\n4. At 45°, straighten wheels, continue back\n5. Clear of front car → turn fully right\n6. Straighten within 30cm of curb",
  "what if i fail the test?": "Don't worry — it's common:\n• Retake after 1–2 weeks\n• Pay re-examination fee\n• Ask examiner what went wrong\n• Focus practice on weak areas\n• Most pass on 2nd or 3rd attempt",
  "documents needed for test?": "You need:\n🪪 National ID\n📋 Valid learning permit\n🏥 Medical certificate (approved doctor)\n📸 2 passport photos\n💰 Fee receipt\n\nArrive early — missing documents = reschedule.",
};

export default function BookPage() {
  // --- Quiz State ---
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState("--");

  // Load best score from local storage
  useEffect(() => {
    const saved = localStorage.getItem("drivejo_quiz_best");
    if (saved) setBestScore(saved);
  }, []);

  const handleSelect = (idx: number) => {
    if (locked) return;
    setLocked(true);
    setSelected(idx);
    if (idx === questions[qi].c) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (qi < questions.length - 1) {
      setQi((prev) => prev + 1);
      setSelected(null);
      setLocked(false);
    } else {
      setFinished(true);
      const finalScore = selected === questions[qi].c ? score + 1 : score;
      const currentBest = parseInt(localStorage.getItem("drivejo_quiz_best") || "0");
      if (finalScore > currentBest) {
        localStorage.setItem("drivejo_quiz_best", finalScore.toString());
        setBestScore(`${finalScore}/${questions.length}`);
      }
    }
  };

  const resetQuiz = () => {
    setQi(0);
    setScore(0);
    setSelected(null);
    setLocked(false);
    setFinished(false);
  };

  const currentQ = questions[qi];
  const currentScore = finished
    ? selected === questions[qi].c
      ? score + 1
      : score
    : score;

  // --- Chat State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! Ask me anything about driving rules, test tips, or road signs in Jordan.",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getReply = (q: string): string => {
    const l = q.toLowerCase().trim();
    for (const [key, val] of Object.entries(aiResponses)) {
      if (l.includes(key) || key.includes(l)) return val;
    }
    if (l.includes("speed")) return aiResponses["speed limits in jordan?"];
    if (l.includes("park")) return aiResponses["how do i parallel park?"];
    if (l.includes("fail") || l.includes("retake")) return aiResponses["what if i fail the test?"];
    if (l.includes("document") || l.includes("paper") || l.includes("id"))
      return aiResponses["documents needed for test?"];
    if (l.includes("sign"))
      return "Jordan uses 3 sign categories:\n🔴 Mandatory (red circle) — must obey\n🟡 Warning (triangle) — be cautious\n🔵 Info (blue square) — guidance";
    if (l.includes("roundabout"))
      return "Roundabout rules:\n1. Yield to traffic inside\n2. Signal left for first exit\n3. Signal right when exiting\n4. Don't cut across lanes";
    return "I can help with speed limits, parking, test documents, roundabouts, and more. Try asking about one of those!";
  };

  const sendMessage = (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText) return;
    
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now(), text: msgText, isUser: true }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: getReply(msgText), isUser: false },
      ]);
    }, 1000 + Math.random() * 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
          <Home className="w-3.5 h-3.5" />
          <a href="#" className="hover:text-gray-600 transition-colors">
            Dashboard
          </a>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 font-medium">Learning Hub</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Learning Hub
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Study materials, practice quizzes, and AI-powered guidance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              3 modules active
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            {
              icon: FileCheck,
              label: "Quiz Questions",
              value: "5",
              color: "indigo",
            },
            {
              icon: AlertTriangle,
              label: "Common Mistakes",
              value: "6",
              color: "red",
            },
            { icon: Bot, label: "Assistant Ready", value: "AI", color: "emerald" },
            {
              icon: Trophy,
              label: "Best Score",
              value: bestScore,
              color: "amber",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 transition-shadow hover:shadow-md"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-${stat.color}-50 flex items-center justify-center shrink-0`}
              >
                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              </div>
              <div>
                <div className="text-lg font-semibold leading-none">
                  {stat.value}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Quiz + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Quiz Module */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    Practice Quiz
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {finished ? "Done" : `${qi + 1} / ${questions.length}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-indigo-600">
                  {currentScore}
                </span>
                <span className="text-xs text-gray-400">pts</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
                style={{
                  width: `${((qi + (finished ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Quiz Body / Done State */}
            {!finished ? (
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-sm font-medium text-gray-800 leading-relaxed mb-5">
                  {currentQ.q}
                </p>
                <div className="space-y-3 flex-1">
                  {currentQ.opts.map((opt, i) => {
                    let classes =
                      "w-full rounded-lg p-3 border text-left text-sm flex items-center gap-3 transition-all duration-200 ";
                    if (locked) {
                      if (i === currentQ.c)
                        classes +=
                          "bg-emerald-50 border-emerald-300 text-emerald-800";
                      else if (i === selected && i !== currentQ.c)
                        classes +=
                          "bg-red-50 border-red-300 text-red-800";
                      else classes += "bg-gray-50 border-gray-100 text-gray-300";
                    } else {
                      classes +=
                        "bg-gray-50 border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer";
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={locked}
                        className={classes}
                      >
                        <span className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {locked && (
                  <div
                    className={`mt-4 p-3 rounded-lg text-xs leading-relaxed border ${
                      selected === currentQ.c
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-red-50 border-red-100 text-red-700"
                    }`}
                  >
                    <span className="font-semibold">
                      {selected === currentQ.c ? "Correct." : "Incorrect."}
                    </span>{" "}
                    {currentQ.exp}
                  </div>
                )}

                {locked && (
                  <button
                    onClick={handleNext}
                    className="mt-4 w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    {qi < questions.length - 1
                      ? "Next Question"
                      : "See Results"}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-1">
                  Quiz Complete
                </p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                  {currentScore}/{questions.length}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {currentScore >= 4
                    ? "Excellent — you're ready!"
                    : currentScore >= 3
                    ? "Good effort — review the mistakes section."
                    : "Keep studying and try again."}
                </p>
                <button
                  onClick={resetQuiz}
                  className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant Module */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[520px] lg:h-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  AI Assistant
                </span>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-gray-400">Online</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 anim-up ${
                    msg.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!msg.isUser && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      msg.isUser
                        ? "bg-indigo-500 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-700 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-gray-100 shrink-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {["Speed limits?", "Parallel park?", "If I fail?", "Documents?"].map(
                  (q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    >
                      {q}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about driving..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 transition-all"
                />
                <button
                  onClick={() => sendMessage()}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Common Mistakes Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-800">
                Common Mistakes
              </span>
              <span className="text-xs text-gray-400 ml-2">
                Top reasons people fail the test
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mistakes.map((m, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-red-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 mb-1">
                      {m.n}
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">
                      {m.d}
                    </p>
                    <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-md bg-amber-50 border border-amber-100">
                      <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-amber-700 leading-relaxed font-medium">
                        {m.t}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}