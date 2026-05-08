"use client";

import { useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newChat = [...chat, { role: "user", content: message }];
    setChat(newChat);
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: newChat }),
    });

    const data = await res.json();

    setChat([
      ...newChat,
      { role: "assistant", content: data.reply },
    ]);

    setLoading(false);
  };

  return (
    <>
      {/* 🔵 زر الفقاعة */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center text-xl hover:scale-110 transition"
      >
        <i className="bi bi-car-front-fill"></i>
      </button>

      {/* 💬 نافذة الشات */}
      {open && (
        <div className="fixed bottom-20 right-5 w-80 h-[500px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="p-3 text-white text-center font-bold border-b border-white/10 flex justify-between items-center">
            <span>Driving AI</span>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          {/* CHAT */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
            {chat.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-blue-500 text-white self-end"
                    : "bg-white text-black self-start"
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="self-start bg-white text-black px-3 py-2 rounded-2xl text-sm animate-pulse">
                typing...
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="p-2 flex gap-2 border-t border-white/10">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask..."
              className="flex-1 px-3 py-2 rounded-xl bg-white text-black text-sm"
            />

            <button
              onClick={sendMessage}
              className="px-3 py-2 rounded-xl bg-blue-500 text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}