
import { useUIContext }        from '../../context/UIContext';
import { useLoreWorldContext } from '../../context/LoreWorldContext';
import { useToast }            from '../../context/ToastContext';
import { BookHeart, Edit3, X } from 'lucide-react';

export default function LoreModal({ isOpen }) {
  const ui = useUIContext();
  const lw = useLoreWorldContext();
  const { toast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" id="modal-lore">
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2 id="lore-modal-title">
            {lw.loreForm.id ? <Edit3 size={18} /> : <BookHeart size={18} />} 
            {lw.loreForm.id ? ' Edit Lore Entry' : ' New Lore Entry'}
          </h2>
          <button className="modal-close-btn" onClick={() => ui.setActiveModal(null)}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom">
          <form id="lore-form" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await lw.handleLoreSubmit(lw.loreForm);
              ui.setActiveModal(null);
            } catch (err) {
              toast.error(`Save failed: ${err.message}`);
            }
          }}>
            <div className="form-group">
              <label>Lore Title / Subject</label>
              <input
                type="text"
                id="lore-title"
                required
                placeholder="e.g., Magic System, The Forbidden City..."
                value={lw.loreForm.title}
                onChange={(e) => lw.setLoreForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label>Trigger Keywords (comma-separated)</label>
              <input
                type="text"
                id="lore-keys"
                required
                placeholder="e.g., magic, spell, ritual, desire..."
                value={lw.loreForm.keys}
                onChange={(e) => lw.setLoreForm(prev => ({ ...prev, keys: e.target.value }))}
              />
              <small className="help-text">When any keyword appears in recent chat, this lore block activates.</small>
            </div>
            
            <div className="form-group">
              <label>Priority Weight</label>
              <input
                type="number"
                id="lore-weight"
                required
                min="1"
                max="10000"
                value={lw.loreForm.weight}
                onChange={(e) => lw.setLoreForm(prev => ({ ...prev, weight: parseInt(e.target.value) || 100 }))}
              />
              <small className="help-text">Higher = injected first when multiple lore entries trigger simultaneously.</small>
            </div>
            
            <div className="form-group">
              <label>Lore Content</label>
              <textarea
                id="lore-content"
                rows="6"
                required
                placeholder="Describe the world rule, location, history, or secret in detail..."
                value={lw.loreForm.content}
                onChange={(e) => lw.setLoreForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            
            <div className="checklist-item mt-10">
              <input
                type="checkbox"
                id="lore-active"
                checked={lw.loreForm.is_active}
                onChange={(e) => lw.setLoreForm(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              <label htmlFor="lore-active" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Active — scan for triggers</label>
            </div>
            <button type="submit" className="primary-btn full-width mt-20">Save Lore Entry</button>
          </form>
        </div>
      </div>
    </div>
  );
}
