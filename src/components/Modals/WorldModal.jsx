import { useUIContext }        from '../../context/UIContext';
import { useLoreWorldContext } from '../../context/LoreWorldContext';
import { useToast }            from '../../context/ToastContext';
import { Globe, X } from 'lucide-react';

export default function WorldModal({ isOpen }) {
  const ui = useUIContext();
  const lw = useLoreWorldContext();
  const { toast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop active" id="modal-world">
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2 id="world-modal-title">
            <Globe size={18} /> New World Setting
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
              toast.success(`World "${lw.worldForm.name}" created!`);
            } catch (err) {
              toast.error(err.message || 'Failed to create world.');
            }
          }}>
            <div className="form-group">
              <label>World Name / Title</label>
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
            
            <button type="submit" className="primary-btn full-width mt-20">Save &amp; Create World</button>
          </form>
        </div>
      </div>
    </div>
  );
}
