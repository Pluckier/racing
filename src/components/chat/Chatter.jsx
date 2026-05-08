import React, { useState, useEffect, useRef } from 'react';
import '../../css/Chatter.css';

const Chatter = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  
  const socket = useRef(null);
  const scrollRef = useRef(null);
  const workerRef = useRef(null); // Ref for the heartbeat worker
  const prevMsgCount = useRef(messages.length);

  // Trigger flashing if a new message arrives while minimized
  useEffect(() => {
    if (isMinimized && messages.length > prevMsgCount.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 3000); // Stop after 3 seconds
      return () => clearTimeout(timer);
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, isMinimized]);

  // Reset flashing immediately if the user expands the chat
  useEffect(() => {
    if (!isMinimized) setIsFlashing(false);
  }, [isMinimized]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const connectWebSocket = () => {
    if (!isJoined) return;

    socket.current = new WebSocket(`wss://www.pluckier.co.uk/utils/chatservice/racing/${username}`);

    // Initialize Worker if it doesn't exist
    if (!workerRef.current) {
      workerRef.current = new Worker('heartbeatWorker.js');
      workerRef.current.onmessage = () => {
        if (socket.current?.readyState === WebSocket.OPEN) {
          socket.current.send("PING");
        }
      };
    }
    workerRef.current.postMessage('START');

    socket.current.onmessage = (event) => {
      if (event.data === "PONG") {
        return;
      }

      if (typeof event.data === 'string' && event.data.startsWith('USERLIST:')) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error("Error parsing message JSON", e);
      }
    };

    socket.current.onclose = () => {
      workerRef.current?.postMessage('STOP');
      
      // Auto-reconnect after 5 seconds if still joined
      setTimeout(() => {
        if (isJoined) connectWebSocket();
      }, 5000);
    };
  };

  useEffect(() => {
    if (isJoined) {
      connectWebSocket();
    }

    return () => {
      socket.current?.close();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [isJoined]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && socket.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ type: 'CHAT', user: username, text: input });
      socket.current.send(payload);
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`chat-modal ${isMinimized ? 'minimized' : ''} ${isFlashing ? 'flashing' : ''}`} style={{ cursor: isMinimized ? 'pointer' : 'default' }}>
      <div className="chat-header" onClick={() => setIsMinimized(!isMinimized)}>
        <span>💬 Chat</span>
        <div className="controls">
          {isMinimized ? '▲' : '−'}
        </div>
      </div>

      {!isMinimized && (
        <div className="chat-body">
          {!isJoined ? (
            <form className="join-form" onSubmit={(e) => { e.preventDefault(); setIsJoined(true); }}>
              <p>Pick a chat nickname:</p>
              <input 
                autoFocus
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Anonymous name..." 
                required 
              />
              <button type="submit">Join</button>
            </form>
          ) : (
            <>
              <div className="messages-container" ref={scrollRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`msg-row ${msg.type === 'SYSTEM' ? 'system' : ''}`}>
                    {msg.type === 'CHAT' && <strong>{msg.user}: </strong>}
                    <span>{msg.text}</span>
                  </div>
                ))}
              </div>
              <form className="input-area" onSubmit={sendMessage}>
                <input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Type message..." 
                />
                <button type="submit">Send</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Chatter;
