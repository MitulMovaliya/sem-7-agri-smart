import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function AIHelper() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (profile) {
      initializeChatSession();
    }
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChatSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Fetch active session
      const activeResponse = await fetch('/api/chat/sessions/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let session = null;
      if (activeResponse.ok) {
        session = await activeResponse.json();
      }

      // 2. If no active session, create a new one
      if (!session) {
        const createResponse = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: 'Chat with Sahayak',
            language: 'en'
          })
        });

        if (createResponse.ok) {
          session = await createResponse.json();
        } else {
          console.error("Failed to create chat session");
        }
      }

      if (session) {
        setSessionId(session.id);
        fetchChatHistory(session.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatHistory = async (sessId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/sessions/${sessId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setMessages(data as Message[]);
        } else {
          // Default welcoming message
          setDefaultWelcomeMessage();
        }
      } else {
        setDefaultWelcomeMessage();
      }
    } catch (err) {
      console.error(err);
      setDefaultWelcomeMessage();
    }
  };

  const setDefaultWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your AgriSmart Assistant. Ask me anything about crops, soil health, fertilizers, weather, or government schemes.'
      }
    ]);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !sessionId) return;

    // Add user message locally
    const userMsg: Message = { id: `temp_${Date.now()}`, role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Placeholder assistant message for streaming
    const assistantMsgId = `stream_${Date.now()}`;
    const assistantMsgPlaceholder: Message = { id: assistantMsgId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsgPlaceholder]);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Session token not found.");

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          prompt: textToSend
        })
      });

      if (!response.body) {
        throw new Error("No response body stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const { text } = JSON.parse(dataStr);
              streamedText += text;
              
              // Update assistant message with stream content
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: streamedText }
                    : msg
                )
              );
            } catch (err) {
              // skip parse errors on partial chunk borders
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: 'Error streaming response. Please check backend connection.' }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const quickSuggestions = ["Best crop to grow?", "NPK optimization?", "Weather forecast?"];

  return (
    <div className="chat-wrapper">
      <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
        <h2 className="page-title" style={{ fontSize: '18px' }}>AI Sahayak</h2>
        <span style={{ fontSize: '11px', color: 'var(--positive)', fontWeight: 'bold' }}>● ONLINE</span>
      </div>

      {/* Messages Canvas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: m.role === 'user' ? 'var(--positive-bg)' : 'var(--surface)',
              color: m.role === 'user' ? 'var(--primary)' : 'var(--text-primary)',
              border: m.role === 'user' ? '1px solid var(--primary-tint)' : '1px solid var(--border)',
              boxShadow: m.role === 'assistant' ? '0 1px 4px rgba(0, 0, 0, 0.04)' : 'none'
            }}
          >
            {m.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>smart_toy</span>
                <span>Krishi Sahayak AI</span>
              </div>
            )}
            {m.role === 'user' ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            ) : (
              <div className="markdown-content">
                {m.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                ) : loading && m.id.startsWith('stream_') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                    <span className="animate-spin material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>sync</span>
                    <span>Writing response...</span>
                  </div>
                ) : (
                  ''
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0', whiteSpace: 'nowrap' }}>
          {quickSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Text Entry footer */}
      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          disabled={loading || !sessionId}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => handleSend(input)}
          className="btn btn-primary"
          style={{ width: '48px', padding: 0 }}
          disabled={loading || !sessionId || !input.trim()}
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
