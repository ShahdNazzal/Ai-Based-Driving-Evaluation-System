"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { role: "assistant", content: "  مرحباً 👋 انا مدربتك الذكية  🤖 كيف يمكنني خدمتك؟ "  },

  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newChat = [...chat, { role: "user", content: message }];
    setChat(newChat);
    setMessage("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newChat }),
    });

    const data = await res.json();
    setChat([...newChat, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <>
      <style>{`
        .chat-bubble-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f2d6e, #0a1a40);
          border: 2px solid #00c8ff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 4px 16px rgba(0,200,255,0.25);
          flex-shrink: 0;
        }
        .chat-bubble-btn:hover { transform: scale(1.08); }

        .bubble-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1000;
        }

        .chat-window {
          position: fixed;
          bottom: 90px;
          right: 15px;
          width: 240px;
          height: 350px;
          background: #1a2a4a;
          border-radius: 18px;
          border: 1px solid #1e3a6e;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        .chat-header {
          background: linear-gradient(135deg, #0f2050, #0a1840);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1e3a6e;
        }

        .header-left { display: flex; align-items: center; gap: 8px; }

        .bot-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f2d6e, #0a1a40);
          border: 2px solid #00c8ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-title {
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .header-title .accent { color: #00c8ff; }

        .header-sub { color: #00c8ff; font-size: 10px; margin: 0; display: flex; align-items: center; gap: 4px; }

        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00ff88;
          display: inline-block;
        }

        .close-btn {
          color: #8aa0c0;
          font-size: 16px;
          cursor: pointer;
          background: none;
          border: none;
          line-height: 1;
          padding: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          background: #162040;
        }

        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: #1e3a6e; border-radius: 4px; }

        .msg {
          max-width: 82%;
          padding: 7px 11px;
          border-radius: 13px;
          font-size: 12px;
          line-height: 1.45;
        }

        .msg.bot {
          background: #1e3a6e;
          color: #c8deff;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
        }

        .msg.user {
          background: #00c8ff;
          color: #0a1628;
          border-bottom-right-radius: 4px;
          align-self: flex-end;
          font-weight: 500;
        }

        .msg.typing {
          background: #1e3a6e;
          color: #5a7aaa;
          font-style: italic;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }

        .chat-input-row {
          padding: 8px 10px;
          background: #0f2050;
          display: flex;
          gap: 7px;
          border-top: 1px solid #1e3a6e;
        }

        .chat-input {
          flex: 1;
          background: #162040;
          border: 1px solid #1e3a6e;
          border-radius: 11px;
          padding: 7px 11px;
          color: #c8deff;
          font-size: 12px;
          outline: none;
        }

        .chat-input::placeholder { color: #4a6080; }

        .send-btn {
          background: #00c8ff;
          border: none;
          border-radius: 9px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0a1628;
          font-size: 16px;
          flex-shrink: 0;
        }

        .send-btn:hover { background: #00aadd; }
      `}</style>

      {/* زر الفقاعة */}
      <div className="bubble-wrapper">
        <button className="chat-bubble-btn" onClick={() => setOpen(!open)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="10" r="6" stroke="#00c8ff" strokeWidth="1.5"/>
            <circle cx="9.5" cy="9.5" r="1.5" fill="#00c8ff"/>
            <circle cx="14.5" cy="9.5" r="1.5" fill="#00c8ff"/>
            <path d="M12 4V2" stroke="#00c8ff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="1.5" r="1" fill="#00c8ff"/>
            <path d="M8 16l-3 4h14l-3-4" stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* نافذة الشات */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="header-left">
              <div className="bot-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="10" r="6" stroke="#00c8ff" strokeWidth="1.5"/>
                  <circle cx="9.5" cy="9.5" r="1.5" fill="#00c8ff"/>
                  <circle cx="14.5" cy="9.5" r="1.5" fill="#00c8ff"/>
                  <path d="M12 4V2" stroke="#00c8ff" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="1.5" r="1" fill="#00c8ff"/>
                  <path d="M8 16l-3 4h14l-3-4" stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="header-title">ROXA <span className="accent">AI</span></p>
                <p className="header-sub"><span className="online-dot"></span>online now</p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {chat.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "bot"}`}>
                {m.content}
              </div>
            ))}
            {loading && (
  <div className="msg typing">
    {/[\u0600-\u06FF]/.test([...chat].reverse().find(m => m.role === "user")?.content || "")
      ? "ROXA يكتب..."
      : "ROXA is typing..."}
  </div>
)}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ask ROXA anything..."
            />
            <button className="send-btn" onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}