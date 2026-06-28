import { useUIContext }        from '../../context/UIContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast }            from '../../context/ToastContext';
import { BookHeart, X } from 'lucide-react';

export default function LoreBookModal({ isOpen }) {
  const ui = useUIContext();
  const lw = useLoreBookContext();
  const { toast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" id="modal-world">
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2 id="world-modal-title">
            <BookHeart size={18} /> New Lore Book
          </h2>
          <button className="modal-close-btn" onClick={() => ui.setActiveModal(null)}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom">
          <form id="world-form" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await lw.handleWorldSubmit(lw.worldForm);
              lw.setWorldForm({ name: '', description: '' });
              ui.setActiveModal(null);
              toast.success(`Lore Book "${lw.worldForm.name}" created!`);
            } catch (err) {
              toast.error(err.message || 'Failed to create lore book.');
            }
          }}>
            <div className="form-group">
              <label>Lore Book Name / Title</label>
              <input
                type="text"
                id="world-name"
                required
                placeholder="e.g., Eloria, Neo-Tokyo 2099, The Abyss..."
                value={lw.worldForm.name}
                onChange={(e) => lw.setWorldForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label>Premise &amp; Rules (Description)</label>
              <textarea
                id="world-description"
                rows="6"
                required
                placeholder="Describe the setting, its rules, atmosphere, and general context..."
                value={lw.worldForm.description}
                onChange={(e) => lw.setWorldForm(prev => ({ ...prev, description: e.target.value }))}
              />
              <small className="help-text">Give a high-level overview of this lorebook's setting for character generation and context.</small>
            </div>
            
            <button type="submit" className="primary-btn full-width mt-20">Save &amp; Create Lore Book</button>
          </form>
        </div>
      </div>
    </div>
  );
}
