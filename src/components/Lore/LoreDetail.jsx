import { useUIContext } from '../../context/UIContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast } from '../../context/ToastContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { ArrowLeft, Plus, Zap, Search, Trash, Download } from 'lucide-react';
import { downloadFile } from '../../utils/fileHelper';

// Subcomponents
import LoreLinkedCharacters from './LoreLinkedCharacters';
import LoreEntryCard from './LoreEntryCard';

export default function LoreDetail() {
  const ui = useUIContext();
  const lw = useLoreBookContext();
  const chars = useCharacterContext();
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

  const handleExportLorebook = async (e) => {
    e.preventDefault();

    if (!activeWorld) {
      toast.error("No active lore book selected.");
      return;
    }

    const exportData = {
      name: activeWorld.name,
      description: activeWorld.description || '',
      entries: {}
    };

    const worldLaws = lw.lore.filter(entry => entry.world_id === lw.currentWorldId);
    worldLaws.forEach((entry, index) => {
      exportData.entries[index] = {
        uid: entry.id,
        key: (entry.keys || "").split(",").map(k => k.trim()).filter(k => k),
        comment: entry.title,
        content: entry.content,
        order: entry.weight || 100,
        constant: false,
        selective: false,
        secondary_keys: [],
        enabled: entry.is_active ? true : false
      };
    });

    const jsonStr = JSON.stringify(exportData, null, 2);
    const fileName = `${activeWorld.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_lorebook.json`;

    await downloadFile({
      data: jsonStr,
      fileName,
      type: 'json',
      onSuccess: () => toast.success(`Lore book "${activeWorld.name}" saved!`),
      onError: (err) => console.warn("Save dialog failed, falling back to basic download", err)
    });
  };

  return (
    <div className="world-detail-view" id="world-detail-view" style={{ display: 'flex' }}>
      <div className="world-info-panel">
        <div className="world-detail-header">
          <button
            id="btn-back-to-worlds"
            className="icon-btn"
            title="Back to Lore Books"
            onClick={() => ui.setActiveWorldDetail(false)}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="world-detail-title-group">
            <h2 id="world-detail-name">{worldName}</h2>
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
            id="btn-export-world"
            className="icon-btn"
            title="Export Lore Book"
            onClick={handleExportLorebook}
          >
            <Download size={16} />
          </button>
          <button
            id="btn-delete-world"
            className="icon-btn danger"
            title="Delete Lore Book"
            onClick={async () => {
              const ok = await showConfirm(`Are you sure you want to permanently delete the lore book "${worldName}"? This will also delete ALL of its associated lore entries.`);
              if (!ok) return;
              try {
                await lw.handleDeleteWorld(lw.currentWorldId);
                ui.setActiveWorldDetail(false);
                toast.success('Lore book deleted.');
              } catch (err) {
                toast.error(`Error deleting lore book: ${err.message}`);
              }
            }}
          >
            <Trash size={16} />
          </button>
        </div>
        
        <div className="world-detail-meta" style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Linked Characters Dropdown */}
          <LoreLinkedCharacters
            currentWorldId={lw.currentWorldId}
            characters={chars.characters}
            worlds={lw.worlds}
            onCharacterSubmit={chars.handleCharacterSubmit}
            toast={toast}
          />

          <div className="world-meta-card" style={{ flex: '0 0 auto', borderRight: 'var(--border-width) solid var(--border)' }}>
            <Zap size={18} />
            <div>
              <span className="world-meta-label">Active Entries</span>
              <span className="world-meta-value" id="world-active-count">
                {activeWorldLaws} / {totalWorldLaws}
              </span>
            </div>
          </div>
          <div className="world-meta-search-container" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'var(--bg-window)' }}>
            <Search className="search-icon" size={14} style={{ color: 'var(--text-muted)', marginRight: '8px', flexShrink: 0 }} />
            <input
              type="text"
              id="search-lore-input-inline"
              placeholder="Search entries..."
              value={ui.searchLoreQuery}
              onChange={(e) => ui.setSearchLoreQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                width: '100%',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-body)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div id="lore-list" className="lore-entries-list scrollbar-custom">
          {filteredLore.length === 0 ? (
            <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
              No lore entries yet. Click "New Entry" to add one!
            </div>
          ) : (
            filteredLore.map(entry => (
              <LoreEntryCard
                key={entry.id}
                entry={entry}
                onToggleActive={lw.handleToggleLoreActive}
                onEditClick={() => lw.handleEditLoreClick(entry, ui.setActiveModal)}
                onDeleteClick={lw.handleDeleteLore}
                showConfirm={showConfirm}
                toast={toast}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
