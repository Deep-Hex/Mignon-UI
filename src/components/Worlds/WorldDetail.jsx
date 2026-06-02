import { useUIContext }        from '../../context/UIContext';
import { useLoreWorldContext } from '../../context/LoreWorldContext';
import { useToast }            from '../../context/ToastContext';
import { ArrowLeft, Plus, ScrollText, Zap, Shield, Search, BookHeart, Edit3, Trash } from 'lucide-react';

export default function WorldDetail() {
  const ui = useUIContext();
  const lw = useLoreWorldContext();
  const { toast, showConfirm } = useToast();

  if (!ui.activeWorldDetail) return null;

  const activeWorld = lw.worlds.find(w => w.id === lw.currentWorldId);
  const worldName = activeWorld?.name;

  const totalWorldLaws = lw.lore.filter(e => e.world_id === lw.currentWorldId).length;
  const activeWorldLaws = lw.lore.filter(e => e.world_id === lw.currentWorldId && e.is_active).length;

  const filteredLore = lw.lore.filter(entry => 
    entry.world_id === lw.currentWorldId && (
      entry.title.toLowerCase().includes(ui.searchLoreQuery.toLowerCase()) || 
      (entry.keys || "").toLowerCase().includes(ui.searchLoreQuery.toLowerCase()) ||
      (entry.content || "").toLowerCase().includes(ui.searchLoreQuery.toLowerCase())
    )
  );

  return (
    <div className="world-detail-view" id="world-detail-view" style={{ display: 'flex' }}>
      <div className="world-info-panel">
        <div className="world-detail-header">
          <button
            id="btn-back-to-worlds"
            className="icon-btn"
            title="Back to Worlds"
            onClick={() => ui.setActiveWorldDetail(false)}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="world-detail-title-group">
            <h2 id="world-detail-name">{worldName}</h2>
            <span id="world-detail-entrycount" className="world-entry-count">
              {totalWorldLaws} {totalWorldLaws === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <button
            id="btn-new-lore"
            className="primary-btn"
            title="Add Lore Entry"
            onClick={() => {
              lw.setLoreForm({
                id: null,
                world_id: lw.currentWorldId,
                title: '',
                keys: '',
                content: '',
                weight: 100,
                is_active: true
              });
              ui.setActiveModal('lore');
            }}
          >
            <Plus size={16} /> New Entry
          </button>
          <button
            id="btn-delete-world"
            className="icon-btn danger"
            title="Delete World"
            onClick={async () => {
              const ok = await showConfirm(`Are you sure you want to permanently delete the world "${worldName}"? This will also delete ALL of its associated lorebook entries.`);
              if (!ok) return;
              try {
                await lw.handleDeleteWorld(lw.currentWorldId);
                ui.setActiveWorldDetail(false);
                toast.success('World deleted.');
              } catch (err) {
                toast.error(`Error deleting world: ${err.message}`);
              }
            }}
          >
            <Trash size={16} />
          </button>
        </div>
        <div className="world-detail-meta">
          <div className="world-meta-card">
            <ScrollText size={18} />
            <div>
              <span className="world-meta-label">World Type</span>
              <span className="world-meta-value">{worldName}</span>
            </div>
          </div>
          <div className="world-meta-card">
            <Zap size={18} />
            <div>
              <span className="world-meta-label">Active Laws</span>
              <span className="world-meta-value" id="world-active-count">
                {activeWorldLaws} / {totalWorldLaws}
              </span>
            </div>
          </div>
          <div className="world-meta-card">
            <Shield size={18} />
            <div>
              <span className="world-meta-label">RAG Status</span>
              <span className="world-meta-value world-rag-badge">Indexed</span>
            </div>
          </div>
        </div>
        <div className="world-search-bar">
          <Search className="search-icon" size={14} />
          <input
            type="text"
            id="search-lore-input-inline"
            placeholder="Search entries..."
            value={ui.searchLoreQuery}
            onChange={(e) => ui.setSearchLoreQuery(e.target.value)}
          />
        </div>
        <div id="lore-list" className="lore-entries-list scrollbar-custom">
          {filteredLore.length === 0 ? (
            <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
              No lore entries yet. Click "New Entry" to add one!
            </div>
          ) : (
            filteredLore.map(entry => {
              const keysList = (entry.keys || "").split(",").map(k => k.trim()).filter(k => k);
              return (
                <div key={entry.id} id={`lore-item-${entry.id}`} className="lore-item animate-fade-in">
                  <div className="lore-item-header">
                    <div className="lore-item-title-section">
                      <BookHeart size={16} />
                      <h4>
                        {entry.title}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
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
                            await lw.handleToggleLoreActive(entry, e.target.checked);
                          } catch {
                            toast.error('Failed to toggle lore status');
                          }
                        }}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <p>{entry.content}</p>
                  <div className="lore-keys-container">
                    {keysList.slice(0, 5).map((k, kIdx) => (
                      <span key={kIdx} className="lore-key-tag">{k}</span>
                    ))}
                    {keysList.length > 5 && (
                      <span className="lore-key-tag">+{keysList.length - 5} more</span>
                    )}
                  </div>
                  <div className="lore-item-footer">
                    <button
                      className="icon-btn text-muted btn-edit-lore"
                      title="Edit Lore Entry"
                      onClick={() => lw.handleEditLoreClick(entry, ui.setActiveModal)}
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
                          await lw.handleDeleteLore(entry);
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
