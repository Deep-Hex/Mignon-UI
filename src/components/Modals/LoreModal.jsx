import React from 'react';
import { useUIContext } from '../../context/UIContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast } from '../../context/ToastContext';
import { BookHeart, Edit3, X } from 'lucide-react';
import TagInput from '../UI/TagInput';

export default function LoreModal({ isOpen }) {
  const ui = useUIContext();
  const lw = useLoreBookContext();
  const { toast } = useToast();

  const [tagInputValue, setTagInputValue] = React.useState('');

  const keysStr = lw.loreForm.keys || '';
  const tags = React.useMemo(() => {
    return keysStr.split(',').map(t => t.trim()).filter(t => t);
  }, [keysStr]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!tagInputValue.trim()) return;
    const rawTags = tagInputValue.split(',');
    const newTags = [...tags];
    let addedAny = false;

    rawTags.forEach(t => {
      const cleanTag = t.trim().toLowerCase();
      if (cleanTag && !newTags.includes(cleanTag)) {
        newTags.push(cleanTag);
        addedAny = true;
      }
    });

    if (addedAny) {
      lw.setLoreForm(prev => ({ ...prev, keys: newTags.join(', ') }));
    }
    setTagInputValue('');
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    lw.setLoreForm(prev => ({ ...prev, keys: newTags.join(', ') }));
  };

  return (
    <div className="modal-backdrop active" id="modal-lore">
      <div className="modal-box glassmorphism scale-in">
        <div className="modal-header">
          <h2 id="lore-modal-title">
            {lw.loreForm.id ? <Edit3 size={18} /> : <BookHeart size={18} />}
            {lw.loreForm.id ? ' Edit Lore Entry' : ' New Lore Entry'}
          </h2>
          <button className="modal-close-btn" onClick={() => { setTagInputValue(''); ui.setActiveModal(null); }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body scrollbar-custom">
          <form id="lore-form" onSubmit={async (e) => {
            e.preventDefault();
            try {
              let finalTags = [...tags];
              if (tagInputValue.trim()) {
                const pendingTags = tagInputValue.split(',');
                pendingTags.forEach(t => {
                  const cleanTag = t.trim().toLowerCase();
                  if (cleanTag && !finalTags.includes(cleanTag)) {
                    finalTags.push(cleanTag);
                  }
                });
              }

              if (finalTags.length === 0) {
                toast.error("Please add at least one trigger keyword.");
                return;
              }

              const finalKeys = finalTags.join(', ');
              await lw.handleLoreSubmit({
                ...lw.loreForm,
                keys: finalKeys
              });
              setTagInputValue('');
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
              <label>Trigger Keywords</label>
              <TagInput
                tags={tags}
                tagInputValue={tagInputValue}
                setTagInputValue={setTagInputValue}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                inputId="lore-tag-input"
                placeholder="Add keywords (comma-separated)..."
                helperText="When any keyword appears in recent chat, this lore block activates."
              />
            </div>

            <div className="form-group">
              <label>Priority Weight</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="number"
                  id="lore-weight"
                  required
                  min="1"
                  max="10000"
                  style={{ width: '120px', flexShrink: 0 }}
                  value={lw.loreForm.weight}
                  onChange={(e) => lw.setLoreForm(prev => ({ ...prev, weight: parseInt(e.target.value) || 100 }))}
                />
                <small className="help-text" style={{ marginTop: 0, flex: 1, fontSize: '0.74rem', lineHeight: '1.3' }}>
                  Higher = injected first when multiple lore entries trigger simultaneously.
                </small>
              </div>
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
            <button type="submit" className="primary-btn full-width mt-20">Save Lore Entry</button>
          </form>
        </div>
      </div>
    </div>
  );
}
