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
    n: "عدم تفقد المرايا قبل أي حركة",
    d: "نسيان النظر للمرايا قبل تغيير المسرب أو التوقف أو الانعطاف.",
    t: "شيّك المرايا بشكل مستمر قبل وأثناء القيادة"
  },
  {
    n: "عدم إعطاء إشارة قبل تغيير الاتجاه",
    d: "تحريك السيارة بدون تشغيل الغماز أو تشغيله متأخر.",
    t: "شغّل الإشارة قبل الحركة بثواني كافية"
  },
  {
    n: "التوقف غير الكامل عند إشارة قف",
    d: "عدم إيقاف السيارة بشكل تام عند علامة التوقف.",
    t: "توقف بالكامل وعدّ 2–3 ثواني قبل المتابعة"
  },
  {
    n: "الدخول الخاطئ إلى الدوّار",
    d: "الدخول بسرعة أو بدون إعطاء أولوية للسيارات داخل الدوّار.",
    t: "خفف السرعة وادخل فقط عند توفر الأمان"
  },
  {
    n: "عدم ترك مسافة أمان كافية",
    d: "الاقتراب الزائد من السيارة الأمامية أثناء السير.",
    t: "حافظ على مسافة لا تقل عن 2–3 ثواني"
  },
  {
    n: "تغيير المسرب بشكل مفاجئ",
    d: "الانتقال بين المسارب بدون إشارة أو بدون التأكد من الطريق.",
    t: "شغّل الإشارة وتأكد من الخلو قبل التغيير"
  },
  {
    n: "السرعة غير المناسبة للطريق",
    d: "القيادة أسرع أو أبطأ من الحد المسموح.",
    t: "التزم بالسرعة حسب اللوحات والإشارات"
  },
  {
    n: "عدم الالتزام بالمسرب الصحيح",
    d: "الخروج من المسرب بشكل غير منظم أثناء القيادة.",
    t: "حافظ على مسارك ولا تغيّره إلا للضرورة"
  },
  {
    n: "الفرملة المفاجئة بدون سبب",
    d: "التوقف الحاد الذي يسبب خطورة على المركبات الخلفية.",
    t: "خفف السرعة تدريجياً قبل التوقف"
  },
  {
    n: "نسيان إطفاء الغماز بعد الانعطاف",
    d: "ترك الإشارة تعمل بعد إنهاء الحركة.",
    t: "تأكد من إطفاء الغماز بعد كل منعطف"
  },
  {
    n: "ضعف التحكم بالمقود",
    d: "لف المقود بطريقة خاطئة أو غير مستقرة أثناء المنعطفات.",
    t: "استخدم أسلوب اليدين 9 و 3 بثبات"
  },
  {
    n: "التوتر أثناء الفحص العملي",
    d: "الارتباك وفقدان التركيز أثناء اختبار القيادة.",
    t: "تنفس بهدوء وركز على كل خطوة قبل تنفيذها"
  }
];

// --- ALL TRAFFIC SIGNS (كلهم مع بعض) ---
const signs: Sign[] = [
  // ✏️ عدلي هون بس (حطي صورك + المسميات + الشرح)

  {
    title:"أفضلية المرور في الشارع الضيق",
    img: "/شواخص/افضلية_المرور_في_الشارع_الضيق.png",
  },
  
  {
    title: "الشواخص الارشادية",
    img: "/شواخص/الشواخص_الارشادية.png",
  },
  {
    title: "الشواخص الارشادية ",
    img: "/شواخص/الشواخص_الارشادية2.png",
  },
  {
    title: "الشواخص الارشادية ",
    img: "/شواخص/الشواخص_الارشادية3.png",
  },
  {
    title: "الشواخص الالزامية",
    img: "/شواخص/الشواخص_الالزامية.png",
  },
  {
    title: "الشواخص الالزامية ",
    img: "/شواخص/الشواخص_الالزامية2.png",
  },

  {
    title: "الشواخص الالزامية ",
    img: "/شواخص/الشواخص_الالزامية3.png",
  },
  {
    title: "الشواخص التحذيرية",
    img: "/شواخص/الشواخص_التحذيرية.png",
  },
  {
    title: "الشواخص التحذيرية ",
    img: "/شواخص/الشواخص_التحذيرية2.png",
  },
  {
    title: "الشواخص التحذيرية ",
    img: "/شواخص/الشواخص_التحذيرية3.png",
  },
   {
    title: "الشواخص السياحية",
    img: "/شواخص/الشواخص_السياحية.png",
  },
  {
    title: " تنظيم حركة المرور",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور4.png",
  },
   {
    title: " الشواخص السياحية",
    img: "/شواخص/الشواخص_السياحية2.png",
  },
   {
    title: "انتهاء منطقة المنع",
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
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع1.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع2.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع3.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع4.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع5.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع6.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع7.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع8.png",
  },
  {
    title: " شواخص المنع",
    img: "/شواخص/شواخص_المنع2.png",
  },
 {
    title: "تنظيم حركة المرور",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور2.png",
  },
  {
    title: " تنظيم حركة المرور",
    img: "/شواخص/شواخص_تنظيم_حركة_المرور3.png",
  },
  

  
  {
    title: "اسم الشاخصة",
    img: "/شواخص/شواخص_ممنواع_الوقوف_والتوقف.png",
  },
    
  // 👇 كملي نفس النمط لكل الصور (5 + 16 + 23 + 1 = كلهم هون)
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
                    الأخطاء الشائعة
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

          {/* 🔥 كل الصور بنفس الجريد */}
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






<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

  {/* LEFT VIDEO */}
  <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300">

    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
      🎥 سلسلة للتعلم مع المدرب رعد عواد
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
      شرح أساسيات القيادة خطوة بخطوة 🚗
    </p>
  </div>

  {/* RIGHT VIDEO */}
  <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-4 hover:shadow-2xl transition-all duration-300">

    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
      🚗 تعلم اصطفاف السيارة
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
      شرح عملي لكيفية اصطفاف السيارة بسهولة وأمان 🅿️
    </p>
  </div>

 </div>
 </div>






    </div>
  );
}