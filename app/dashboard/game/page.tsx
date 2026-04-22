"use client";

import Image from "next/image";
import { useState } from "react";

const instructors = [
  {
    name: "فادي عوّاد",
    phone: "962799621717",
    displayPhone: "+962 7 9962 1717",
    image: "/المدرب_فادي.jpg",
  },

  {
    name: "نضال الفوعري",
    phone: "962796180167",
    displayPhone: "+962 796180167",
    image: "/المدرب_نضال.jpeg",
  },
  {
    name: "عدنان رمضان",
    phone: "962788443081",
    displayPhone: "+962 788443081",
    image: "/المدرب_عدنان.jpeg",
  },
  {
    name: "رعد عواد",
    phone: "962799924343",
    displayPhone: "+962 7 9992 4343",
    image: "/المدرب_رعد.jpeg",
  },
  {
    name: "مصعب الصلاحات",
    phone: "962780779195",
    displayPhone: "+962 7 8077 9195",
    image: "/المدرب_مصعب.jpeg",
  },
  {
    name: "عصري",
    phone: "962772096066",
    displayPhone: "+962 7 7209 6066",
    image: "/المدرب_عصري.png",
  },
];

function PhoneIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-gray-200 text-gray-800 text-sm font-medium shadow-2xl shadow-black/10 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className="flex items-center gap-2">
        <CheckIcon className="w-4 h-4 text-emerald-500" />
        {message}
      </span>
    </div>
  );
}

export default function InstructorsPage() {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setToast({ message: "تم نسخ الرقم بنجاح", visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 antialiased">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,255,0.06),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(56,120,255,0.05),transparent)]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-16 pb-4 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-500 tracking-wide">
                متاح الآن
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 text-gray-900">
              اختر{" "}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                مدربك
              </span>
            </h1>

            <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              مدربون محترفون معتمدون · خبرة عملية واسعة · ابدأ رحلتك الآن
            </p>
          </div>
        </header>

        {/* Grid */}
        <main className="px-6 pb-24 pt-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {instructors.map((inst, index) => (
              <div
                key={index}
                className="group relative rounded-2xl bg-white border border-gray-200/80 overflow-hidden transition-all duration-700 hover:border-gray-300 hover:shadow-xl hover:shadow-black/[0.06]"
                style={{
                  animationDelay: `${index * 80}ms`,
                  animation: "fadeUp 0.6s ease-out both",
                }}
              >
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={inst.image}
                    alt={inst.name}
                    fill
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Bottom info on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h2 className="text-xl font-semibold text-white tracking-tight">
                      {inst.name}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 text-white/60 text-sm font-mono tracking-wide">
                      <PhoneIcon className="w-3.5 h-3.5" />
                      {inst.displayPhone}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-3 flex gap-2">
                  <a
                    href={`tel:+${inst.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all duration-300"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>

                  <a
                    href={`https://wa.me/${inst.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all duration-300"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>واتساب</span>
                  </a>

                  <button
                    onClick={() => handleCopy(inst.displayPhone)}
                    className="flex items-center justify-center w-11 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 shrink-0"
                    title="نسخ الرقم"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <div className="pb-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <p className="text-center text-gray-400 text-xs mt-6 font-mono">
              © {new Date().getFullYear()} · جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}