import React from 'react';
import { Search, BookHeart, Upload, ChevronRight } from 'lucide-react';
import { useUIContext } from '../../context/UIContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast } from '../../context/ToastContext';

export default function LorePanel({ onWorldContextMenu }) {
  const ui = useUIContext();
  const lw = useLoreBookContext();
  const { toast } = useToast();

  const [searchWorldsQuery, setSearchWorldsQuery] = React.useState('');
  const [editingWorldId, setEditingWorldId] = React.useState(null);
  const [editWorldName, setEditWorldName] = React.useState('');

  const handleSaveWorldRename = async (worldId, oldName) => {
    const trimmed = editWorldName.trim();
    setEditingWorldId(null);
    if (trimmed && trimmed !== oldName) {
      try {
        await lw.handleRenameWorld(worldId, trimmed);
        toast.success(`Lore book renamed to "${trimmed}"`);
      } catch (err) {
        toast.error(`Rename failed: ${err.message}`);
      }
    }
  };

  const filteredWorlds = lw.worlds.filter(w => {
    const q = (searchWorldsQuery || '').toLowerCase();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      (w.description && w.description.toLowerCase().includes(q))
    );
  });

  return (
    <div id="content-lore" className={`tab-content ${ui.activeTab === 'lore' ? 'active' : ''}`}>
      <div className="search-bar">
        <Search className="search-icon" size={14} />
        <input
          type="text"
          id="search-worlds-input"
          placeholder="Search lore books..."
          value={searchWorldsQuery}
          onChange={(e) => setSearchWorldsQuery(e.target.value)}
        />
      </div>
      <div className="action-bar" style={{ display: 'flex', gap: '8px' }}>
        <button
          id="btn-new-world"
          className="primary-btn"
          style={{ flex: 1 }}
          onClick={() => {
            lw.setWorldForm({ name: '', description: '' });
            ui.setActiveModal('world');
          }}
        >
          <BookHeart size={16} /> New Lore
        </button>
        {window.__TAURI_INTERNALS__ ? (
          <button
            type="button"
            className="primary-btn cursor-pointer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={async () => {
              try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const selected = await open({
                  multiple: true,
                  filters: [{ name: 'World JSON', extensions: ['json'] }]
                });
                if (!selected) return;
                const paths = Array.isArray(selected) ? selected : [selected];
                const results = { ok: [], fail: [] };
                for (const filePath of paths) {
                  const fileName = filePath.split(/[/\\]/).pop();
                  try {
                    const text = await readTextFile(filePath);
                    const data = JSON.parse(text);
                    const world = await lw.handleWorldImport(fileName, data);
                    results.ok.push(world.name);
                  } catch {
                    results.fail.push(fileName);
                  }
                }
                if (results.ok.length > 0) {
                  toast.success(
                    results.ok.length === 1
                      ? `Imported lore book: ${results.ok[0]}`
                      : `Imported ${results.ok.length} lore books successfully!`
                  );
                }
                if (results.fail.length > 0) {
                  toast.error(
                    results.fail.length === 1
                      ? `Failed to import: ${results.fail[0]}`
                      : `${results.fail.length} imports failed: ${results.fail.join(', ')}`
                  );
                }
              } catch (err) {
                if (err.name !== 'AbortError') toast.error(`Import failed: ${err.message}`);
              }
            }}
          >
            <Upload size={16} /> Import Lore
          </button>
        ) : (
          <>
            <button
              type="button"
              className="primary-btn cursor-pointer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => document.getElementById('import-world-input')?.click()}
            >
              <Upload size={16} /> Import Lore
            </button>
            <input
              type="file"
              id="import-world-input"
              accept="application/json,.json"
              multiple
              style={{ display: 'none' }}
              onChange={async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                const results = { ok: [], fail: [] };
                for (const file of files) {
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const world = await lw.handleWorldImport(file.name, data);
                    results.ok.push(world.name);
                  } catch {
                    results.fail.push(file.name);
                  }
                }
                if (results.ok.length > 0) {
                  toast.success(
                    results.ok.length === 1
                      ? `Imported lore book: ${results.ok[0]}`
                      : `Imported ${results.ok.length} lore books successfully!`
                  );
                }
                if (results.fail.length > 0) {
                  toast.error(
                    results.fail.length === 1
                      ? `Failed to import: ${results.fail[0]}`
                      : `${results.fail.length} imports failed: ${results.fail.join(', ')}`
                  );
                }
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
      <div id="world-list" className="world-vertical-list scrollbar-custom">
        {filteredWorlds.length === 0 ? (
          <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {lw.worlds.length === 0
              ? "No lore books yet. Create one to begin!"
              : "No lore books match your search."}
          </div>
        ) : (
          filteredWorlds.map((w, idx) => {
            const worldLaws = lw.lore.filter(e => e.world_id === w.id);
            const isEditing = editingWorldId === w.id;
            return (
              <div
                key={idx}
                className="world-card animate-fade-in"
                onClick={() => {
                  if (!isEditing) {
                    lw.setCurrentWorldId(w.id);
                    ui.setActiveWorldDetail(true);
                  }
                }}
                onContextMenu={(e) => onWorldContextMenu(e, w, {
                  setEditingWorldId,
                  setEditWorldName
                })}
              >
                <div className="world-card-icon"><BookHeart size={16} /></div>
                <div className="world-card-body">
                  {isEditing ? (
                    <input
                      type="text"
                      className="rename-input"
                      value={editWorldName}
                      onChange={(e) => setEditWorldName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          await handleSaveWorldRename(w.id, w.name);
                        } else if (e.key === 'Escape') {
                          setEditingWorldId(null);
                        }
                      }}
                      onBlur={() => handleSaveWorldRename(w.id, w.name)}
                      autoFocus
                    />
                  ) : (
                    <h4>{w.name}</h4>
                  )}
                  <p>{worldLaws.length} lore {worldLaws.length === 1 ? 'entry' : 'entries'} &bull; {worldLaws.filter(e => e.is_active).length} active</p>
                </div>
                <div className="world-card-badge"><ChevronRight size={16} /></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
