/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useUIContext }   from '../../context/UIContext';
import { useChatContext } from '../../context/ChatContext';
import { fetchRoomMemories } from '../../services/api';
import { Scroll, X, Clock, AlertCircle } from 'lucide-react';

export default function MemoryModal({ isOpen }) {
  const ui   = useUIContext();
  const chat = useChatContext();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && chat.currentRoomId) {
      setLoading(true);
      fetchRoomMemories(chat.currentRoomId)
        .then(setMemories)
        .catch(err => {
          console.error("Failed to load room memories:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, chat.currentRoomId]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" id="modal-memories">
      <div className="modal-box glassmorphism scale-in" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2 id="memories-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scroll size={18} className="text-accent" /> 
            Smart Memory Book
          </h2>
          <button className="modal-close-btn" onClick={() => ui.setActiveModal(null)}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom" style={{ padding: '20px' }}>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            These are the condensed episodic summaries compiled by the AI background worker. 
            The characters semantically search and recall these chapters during live chat!
          </p>

          {loading ? (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <div className="typing-indicator" style={{ display: 'inline-flex', marginBottom: '10px' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
              <div>Consulting the Archives...</div>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-30" style={{ color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px' }}>
              <AlertCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Smart Memory Book is Empty</div>
              <div style={{ fontSize: '0.8rem' }}>Once this chat reaches 15+ messages, the first chapter will write itself automatically!</div>
            </div>
          ) : (
            <div className="memory-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {memories.map((m, idx) => {
                const dateStr = new Date(m.created_at).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                return (
                  <div 
                    key={m.id} 
                    className="memory-card" 
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      position: 'relative',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ✦ Chapter {idx + 1}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {dateStr}
                      </span>
                    </div>
                    <div 
                      className="memory-text" 
                      style={{ 
                        fontSize: '0.85rem', 
                        lineHeight: '1.45', 
                        color: 'rgba(255,255,255,0.85)',
                        fontStyle: 'italic'
                      }}
                    >
                      "{m.summary_text}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
