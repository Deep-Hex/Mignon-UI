import React from 'react';
import { BookHeart, Edit3, Trash } from 'lucide-react';

export default function LoreEntryCard({
  entry,
  onToggleActive,
  onEditClick,
  onDeleteClick,
  showConfirm,
  toast
}) {
  const keysList = React.useMemo(() => {
    return (entry.keys || "").split(",").map(k => k.trim()).filter(k => k);
  }, [entry.keys]);

  return (
    <div className="lore-item animate-fade-in">
      <div className="lore-item-header">
        <div className="lore-item-title-section">
          <BookHeart size={16} />
          <h4>
            {entry.title}
            <span className="lore-item-weight-badge">
              W: {entry.weight || 100}
            </span>
          </h4>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            className="toggle-lore-active"
            checked={entry.is_active}
            onChange={async (e) => {
              try {
                await onToggleActive(entry, e.target.checked);
              } catch {
                toast.error('Failed to toggle lore status');
              }
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      <p>{entry.content}</p>
      <div className="lore-item-footer">
        <div className="lore-keys-container">
          {keysList.slice(0, 5).map((k, kIdx) => (
            <span key={kIdx} className="lore-key-tag">{k}</span>
          ))}
          {keysList.length > 5 && (
            <span className="lore-key-tag">+{keysList.length - 5} more</span>
          )}
        </div>
        <div className="lore-footer-buttons" style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            className="icon-btn text-muted btn-edit-lore"
            title="Edit Lore Entry"
            onClick={onEditClick}
          >
            <Edit3 style={{ width: '14px', height: '14px' }} />
          </button>
          <button
            className="icon-btn danger btn-del-lore"
            title="Delete Lore Entry"
            onClick={async () => {
              const ok = await showConfirm(`Are you sure you want to delete "${entry.title}"?`);
              if (!ok) return;
              try {
                await onDeleteClick(entry);
                toast.success('Lore entry deleted.');
              } catch {
                toast.error('Failed to delete lore entry');
              }
            }}
          >
            <Trash style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
