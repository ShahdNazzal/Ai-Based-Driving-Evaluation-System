"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { role: "assistant", content: "مرحباً! أنا مساعدك في تقييم مهارات القيادة. كيف يمكنني مساعدتك؟ 👋" }
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
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #0f2d6e;
          border: 2px solid #00c8ff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1000;
          transition: transform 0.2s;
          box-shadow: 0 4px 16px rgba(0,200,255,0.25);
        }
        .chat-bubble-btn:hover { transform: scale(1.08); }

        .chat-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 320px;
          height: 440px;
          background: #1a2a4a;
          border-radius: 20px;
          border: 1px solid #1e3a6e;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        .chat-header {
          background: #0f2050;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1e3a6e;
        }

        .header-left { display: flex; align-items: center; gap: 10px; }

        .bot-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0f2d6e;
          border: 2px solid #00c8ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-title { color: #ffffff; font-size: 14px; font-weight: 500; margin: 0; }
        .header-sub { color: #00c8ff; font-size: 11px; margin: 0; display: flex; align-items: center; gap: 4px; }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00ff88;
          display: inline-block;
        }

        .close-btn {
          color: #8aa0c0;
          font-size: 18px;
          cursor: pointer;
          background: none;
          border: none;
          line-height: 1;
          padding: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #162040;
        }

        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: #1e3a6e; border-radius: 4px; }

        .msg {
          max-width: 82%;
          padding: 8px 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
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
          padding: 10px 12px;
          background: #0f2050;
          display: flex;
          gap: 8px;
          border-top: 1px solid #1e3a6e;
        }

        .chat-input {
          flex: 1;
          background: #162040;
          border: 1px solid #1e3a6e;
          border-radius: 12px;
          padding: 8px 12px;
          color: #c8deff;
          font-size: 13px;
          outline: none;
        }

        .chat-input::placeholder { color: #4a6080; }

        .send-btn {
          background: #00c8ff;
          border: none;
          border-radius: 10px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0a1628;
          font-size: 18px;
          flex-shrink: 0;
        }

        .send-btn:hover { background: #00aadd; }
      `}</style>

      {/* زر الفقاعة */}
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

      {/* نافذة الشات */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="header-left">
              <div className="bot-avatar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="10" r="6" stroke="#00c8ff" strokeWidth="1.5"/>
                  <circle cx="9.5" cy="9.5" r="1.5" fill="#00c8ff"/>
                  <circle cx="14.5" cy="9.5" r="1.5" fill="#00c8ff"/>
                  <path d="M12 4V2" stroke="#00c8ff" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="1.5" r="1" fill="#00c8ff"/>
                  <path d="M8 16l-3 4h14l-3-4" stroke="#00c8ff" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="header-title">Driving AI</p>
                <p className="header-sub"><span className="online-dot"></span>Online</p>
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
            {loading && <div className="msg typing">يكتب...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
            />
            <button className="send-btn" onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}