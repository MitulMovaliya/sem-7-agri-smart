import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function AIHelper() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (profile) {
      loadSessionsAndInitialize();
    }
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessionsAndInitialize = async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const list: ChatSessionItem[] = await res.json();
        setSessions(list);

        if (list.length > 0) {
          // Select most recent session by default
          const active = list[0];
          setSessionId(active.id);
          fetchChatHistory(active.id);
        } else {
          // No sessions exist yet, create a new clean one
          await handleNewChat();
        }
      } else {
        await handleNewChat();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const list: ChatSessionItem[] = await res.json();
        setSessions(list);
      }
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const createResponse = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New Chat',
          language: 'en'
        })
      });

      if (createResponse.ok) {
        const newSession: ChatSessionItem = await createResponse.json();
        setSessionId(newSession.id);
        setDefaultWelcomeMessage();
        fetchSessions();
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to create new chat session:", err);
    }
  };

  const selectSession = (sessId: string) => {
    if (sessId === sessionId) return;
    setSessionId(sessId);
    fetchChatHistory(sessId);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessId: string) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`/api/chat/sessions/${sessId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const updatedList = sessions.filter(s => s.id !== sessId);
        setSessions(updatedList);

        if (sessId === sessionId) {
          if (updatedList.length > 0) {
            setSessionId(updatedList[0].id);
            fetchChatHistory(updatedList[0].id);
          } else {
            handleNewChat();
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
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

      // Refresh history sidebar after response completes to capture auto-title updates
      fetchSessions();
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

  const groupSessionsByDate = (items: ChatSessionItem[]) => {
    const today: ChatSessionItem[] = [];
    const yesterday: ChatSessionItem[] = [];
    const older: ChatSessionItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    items.forEach(item => {
      const itemDate = new Date(item.updatedAt || item.createdAt).getTime();
      if (itemDate >= startOfToday) {
        today.push(item);
      } else if (itemDate >= startOfYesterday) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return { today, yesterday, older };
  };

  const grouped = groupSessionsByDate(sessions);
  const currentSession = sessions.find(s => s.id === sessionId);
  const quickSuggestions = ["Best crop to grow?", "NPK optimization?", "Weather forecast?"];

  return (
    <div className="chat-layout">
      {/* Mobile Drawer Backdrop Overlay */}
      <div 
        className={`chat-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      {/* ChatGPT-style Left Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-header">
          <button onClick={handleNewChat} className="new-chat-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>New Chat</span>
          </button>
        </div>

        <div className="chat-history-list">
          {sessionsLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Loading history...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              No chat history yet
            </div>
          ) : (
            <>
              {grouped.today.length > 0 && (
                <div>
                  <div className="chat-history-group-title">Today</div>
                  {grouped.today.map(s => (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`chat-history-item ${s.id === sessionId ? 'active' : ''}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-secondary)', marginRight: '6px' }}>chat_bubble_outline</span>
                      <span className="chat-history-title">{s.title}</span>
                      <button
                        className="chat-history-delete-btn"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {grouped.yesterday.length > 0 && (
                <div>
                  <div className="chat-history-group-title">Yesterday</div>
                  {grouped.yesterday.map(s => (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`chat-history-item ${s.id === sessionId ? 'active' : ''}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-secondary)', marginRight: '6px' }}>chat_bubble_outline</span>
                      <span className="chat-history-title">{s.title}</span>
                      <button
                        className="chat-history-delete-btn"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {grouped.older.length > 0 && (
                <div>
                  <div className="chat-history-group-title">Older</div>
                  {grouped.older.map(s => (
                    <div
                      key={s.id}
                      onClick={() => selectSession(s.id)}
                      className={`chat-history-item ${s.id === sessionId ? 'active' : ''}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-secondary)', marginRight: '6px' }}>chat_bubble_outline</span>
                      <span className="chat-history-title">{s.title}</span>
                      <button
                        className="chat-history-delete-btn"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Chat View Container */}
      <main className="chat-main">
        {/* Main Header */}
        <div className="chat-main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              title="Toggle History Sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu</span>
            </button>

            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                {currentSession?.title || 'AI Sahayak'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--positive)', fontWeight: 'bold' }}>
                <span>●</span>
                <span>ONLINE</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages Canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 16px', whiteSpace: 'nowrap' }}>
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
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', padding: '12px 16px', backgroundColor: 'var(--surface)' }}>
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
      </main>
    </div>
  );
}
