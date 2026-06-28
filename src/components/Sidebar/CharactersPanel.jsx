import React from 'react';
import { Search, LayoutGrid, List, Plus, Upload, User as UserIcon, Edit3, Trash } from 'lucide-react';
import { useUIContext } from '../../context/UIContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useChatContext } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';

// Helper to dynamically fit as many tags as possible on a single line based on character length
function fitTraitsByLength(allTraits, maxCharLength) {
  const finalTraits = [];
  let currentLen = 0;

  for (const t of allTraits) {
    const tagCost = t.length + 2; // Tag character length + padding/gap estimation
    if (finalTraits.length > 0 && currentLen + tagCost > maxCharLength) {
      break;
    }
    finalTraits.push(t);
    currentLen += tagCost;
  }

  return {
    finalTraits,
    overflowCount: allTraits.length - finalTraits.length
  };
}

function CharacterActions({ character, className, chars, ui, showConfirm, toast }) {
  return (
    <div className={className}>
      <button
        className="icon-btn text-muted btn-edit-char"
        title="Edit Character"
        onClick={(e) => {
          e.stopPropagation();
          chars.handleEditCharacterClick(character, ui.setActiveModal);
        }}
      >
        <Edit3 style={{ width: '12px', height: '12px' }} />
      </button>
      <button
        className="icon-btn danger btn-del-char"
        title="Delete Character"
        onClick={async (e) => {
          e.stopPropagation();
          const ok = await showConfirm(`Are you sure you want to delete ${character.name}?`);
          if (!ok) return;
          try {
            await chars.handleDeleteCharacter(character.id);
            toast.success(`${character.name} deleted.`);
          } catch {
            toast.error('Failed to delete character');
          }
        }}
      >
        <Trash style={{ width: '12px', height: '12px' }} />
      </button>
    </div>
  );
}

export default function CharactersPanel() {
  const ui = useUIContext();
  const chars = useCharacterContext();
  const lw = useLoreBookContext();
  const chat = useChatContext();
  const { toast, showConfirm } = useToast();

  const [searchCharsQuery, setSearchCharsQuery] = React.useState('');
  const [charViewMode, setCharViewMode] = React.useState('grid'); // 'grid' or 'list'
  const [brokenAvatars, setBrokenAvatars] = React.useState({});

  const filteredCharacters = chars.characters.filter(c =>
    c.name.toLowerCase().includes(searchCharsQuery.toLowerCase()) ||
    (c.personality && c.personality.toLowerCase().includes(searchCharsQuery.toLowerCase()))
  );

  return (
    <div id="content-chars" className={`tab-content ${ui.activeTab === 'chars' ? 'active' : ''}`}>
      <div className="search-bar-row">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search className="search-icon" size={14} />
          <input
            type="text"
            id="search-chars-input"
            placeholder="Search characters..."
            value={searchCharsQuery}
            onChange={(e) => setSearchCharsQuery(e.target.value)}
          />
        </div>
        {!ui.isMobileDevice && (
          <button
            className="char-view-toggle-btn"
            title={charViewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
            onClick={() => setCharViewMode(m => m === 'grid' ? 'list' : 'grid')}
          >
            {charViewMode === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
          </button>
        )}
      </div>
      
      <div className="action-bar">
        <button
          id="btn-new-char"
          className="primary-btn"
          onClick={() => {
            chars.setCharacterForm({ id: null, world_id: lw.currentWorldId, name: '', avatar: null, greeting: '', personality: '', scenario: '', example_dialogue: '' });
            ui.setActiveModal('character');
          }}
        >
          <Plus size={16} /> New Character
        </button>
        {window.__TAURI_INTERNALS__ ? (
          <button
            type="button"
            className="primary-btn cursor-pointer"
            onClick={async () => {
              try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readFile, readTextFile } = await import('@tauri-apps/plugin-fs');
                const selected = await open({
                  multiple: true,
                  filters: [{ name: 'Character Cards', extensions: ['png', 'json'] }]
                });
                if (!selected) return;
                const paths = Array.isArray(selected) ? selected : [selected];
                const results = { ok: [], fail: [] };
                for (const filePath of paths) {
                  try {
                    const isPng = filePath.toLowerCase().endsWith('.png');
                    let fileObj;
                    if (isPng) {
                      const bytes = await readFile(filePath);
                      fileObj = new File([bytes], filePath.split(/[/\\]/).pop(), { type: 'image/png' });
                    } else {
                      const text = await readTextFile(filePath);
                      const name = filePath.split(/[/\\]/).pop();
                      fileObj = new File([text], name, { type: 'application/json' });
                    }
                    const char = await chars.handleTavernImport(fileObj);
                    results.ok.push(char.name);
                  } catch {
                    results.fail.push(filePath.split(/[/\\]/).pop());
                  }
                }
                if (results.ok.length > 0) {
                  toast.success(
                    results.ok.length === 1
                      ? `Imported: ${results.ok[0]}`
                      : `Imported ${results.ok.length} characters successfully!`
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
            <Upload size={16} /> Import Card
          </button>
        ) : (
          <>
            <button
              type="button"
              className="primary-btn cursor-pointer"
              onClick={() => document.getElementById('import-tavern-input')?.click()}
            >
              <Upload size={16} /> Import Card
            </button>
            <input
              type="file"
              id="import-tavern-input"
              accept="image/png,application/json,.json"
              multiple
              style={{ display: 'none' }}
              onChange={async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                const results = { ok: [], fail: [] };
                for (const file of files) {
                  try {
                    const char = await chars.handleTavernImport(file);
                    results.ok.push(char.name);
                  } catch {
                    results.fail.push(file.name);
                  }
                }
                if (results.ok.length > 0) {
                  toast.success(
                    results.ok.length === 1
                      ? `Imported: ${results.ok[0]}`
                      : `Imported ${results.ok.length} characters successfully!`
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

      <div
        id="character-list"
        className="character-list-scroll-container scrollbar-custom"
      >
        {filteredCharacters.length === 0 ? (
          <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No characters yet. Import a Tavern card or create one!
          </div>
        ) : (ui.isMobileDevice || charViewMode === 'grid') ? (
          <div className="character-grid">
            {filteredCharacters.map(c => {
              const hasAvatar = c.avatar && !brokenAvatars[c.id];

              return (
                <div
                  key={c.id}
                  id={`char-card-${c.id}`}
                  className={`char-card animate-fade-in ${hasAvatar ? 'has-avatar' : ''}`}
                  onClick={() => chat.handleStartSingleChat(c, ui.setActiveModal, ui.setActiveTab, ui.setActiveWorldDetail)}
                >
                  <CharacterActions
                    character={c}
                    className="char-card-actions"
                    chars={chars}
                    ui={ui}
                    showConfirm={showConfirm}
                    toast={toast}
                  />

                  {hasAvatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="char-card-bg-img"
                      onError={() => setBrokenAvatars(prev => ({ ...prev, [c.id]: true }))}
                    />
                  ) : (
                    <div className="char-card-fallback-bg">
                      <UserIcon size={32} />
                    </div>
                  )}

                  <div className="char-card-overlay-container">
                    <h4 className="char-card-name">{c.name}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="character-list-mode">
            {filteredCharacters.map(c => {
              let traits = [];
              if (c.personality) {
                const match = c.personality.match(/\[Tags:\s*([^\]]*)\]/);
                if (match) {
                  traits = match[1].split(',').map(t => t.trim()).filter(Boolean);
                }
              }
              const { finalTraits, overflowCount } = fitTraitsByLength(traits, 32);
              const colors = ['pink', 'blue', 'purple'];

              return (
                <div
                  key={c.id}
                  id={`char-list-${c.id}`}
                  className="char-list-item animate-fade-in"
                  onClick={() => chat.handleStartSingleChat(c, ui.setActiveModal, ui.setActiveTab, ui.setActiveWorldDetail)}
                >
                  <div className="char-list-avatar">
                    {c.avatar && !brokenAvatars[c.id] ? (
                      <img
                        src={c.avatar}
                        alt={c.name}
                        onError={() => setBrokenAvatars(prev => ({ ...prev, [c.id]: true }))}
                      />
                    ) : (
                      <UserIcon size={18} />
                    )}
                  </div>

                  <div className="char-list-info">
                    <h4>{c.name}</h4>
                    {finalTraits.length > 0 && (
                      <div className="char-list-badge-row">
                        {finalTraits.map((t, idx) => {
                          const colorClass = colors[(c.id + idx) % colors.length];
                          return (
                            <span key={idx} className={`char-badge ${colorClass}`}>
                              {t}
                            </span>
                          );
                        })}
                        {overflowCount > 0 && (
                          <span className="char-badge count-badge">
                            +{overflowCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <CharacterActions
                    character={c}
                    className="char-list-actions"
                    chars={chars}
                    ui={ui}
                    showConfirm={showConfirm}
                    toast={toast}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
