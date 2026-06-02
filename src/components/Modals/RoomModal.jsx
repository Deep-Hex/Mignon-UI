import { useUIContext } from '../../context/UIContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useChatContext } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { PlusCircle, X, User as UserIcon } from 'lucide-react';

export default function RoomModal({ isOpen }) {
  const ui = useUIContext();
  const chars = useCharacterContext();
  const chat = useChatContext();
  const { toast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" id="modal-room">
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2><PlusCircle size={18} /> Create Chat/Group</h2>
          <button className="modal-close-btn" onClick={() => ui.setActiveModal(null)}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom" style={{ backgroundImage: 'none' }}>
          <form id="room-form" onSubmit={async (e) => {
            e.preventDefault();
            try {
              const room = await chat.handleRoomSubmit(chat.roomForm);
              ui.setActiveModal(null);
              chat.handleEnterRoom(room.id, ui.setActiveModal, true, ui.setActiveTab, ui.setActiveWorldDetail);
            } catch (err) {
              toast.error(`Failed to create chat: ${err.message}`);
            }
          }}>
            <div className="form-group">
              <label>Chat/Group Name</label>
              <input
                type="text"
                id="room-name"
                required
                placeholder="e.g., The Velvet Lounge, Midnight Gardens..."
                value={chat.roomForm.name}
                onChange={(e) => chat.setRoomForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Roleplay Scenario (Optional)</label>
              <textarea
                id="room-description"
                placeholder="e.g., We are trapped in a collapsing ancient cavern trying to find a way out while dark creatures stalk us..."
                rows="3"
                className="scrollbar-custom"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--r-md)',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                  resize: 'vertical'
                }}
                value={chat.roomForm.description}
                onChange={(e) => chat.setRoomForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Choose Characters</label>
              <div className="character-select-grid scrollbar-custom">
                {chars.characters.length === 0 ? (
                  <div className="text-center w-full py-10" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Create characters first!
                  </div>
                ) : (
                  chars.characters.map(c => {
                    const isChecked = chat.roomForm.selectedCharIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`character-select-card ${isChecked ? 'active' : ''} animate-fade-in`}
                        onClick={() => chat.handleToggleRoomChar(c.id)}
                      >
                        <div className="char-select-avatar">
                          {c.avatar ? <img src={c.avatar} alt={c.name} /> : <UserIcon size={24} />}
                          {isChecked && (
                            <div className="char-select-check-badge">✓</div>
                          )}
                        </div>
                        <span className="char-select-name">{c.name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <button type="submit" className="primary-btn full-width mt-10">Start Chat</button>
          </form>
        </div>
      </div>
    </div>
  );
}
