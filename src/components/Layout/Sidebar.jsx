import React from 'react';
import DarfLogo from './DarfLogo';
import { useUIContext } from '../../context/UIContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useCharacterContext } from '../../context/CharacterContext';
import { useChatContext } from '../../context/ChatContext';
import { useLoreWorldContext } from '../../context/LoreWorldContext';
import { useToast } from '../../context/ToastContext';
import {
  Settings as SettingsIcon, Heart, MessageCircle, BookHeart,
  Plus, Upload, Search, Globe, ChevronRight,
  User as UserIcon, Edit3, Trash, Sun, Moon, LayoutGrid, List,
  MessageSquarePlus, Users
} from 'lucide-react';

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

export default function Sidebar() {
  const ui = useUIContext();
  const settings = useSettingsContext();
  const chars = useCharacterContext();
  const chat = useChatContext();
  const lw = useLoreWorldContext();
  const { toast, showConfirm } = useToast();

  const [brokenAvatars, setBrokenAvatars] = React.useState({});
  const [charViewMode, setCharViewMode] = React.useState('grid'); // 'grid' or 'list'

  const [activeRoomFilter, setActiveRoomFilter] = React.useState('all'); // 'all', 'groups', 'favorites'
  const [favoriteRoomIds, setFavoriteRoomIds] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fav_rooms') || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavoriteRoom = (roomId, e) => {
    e.stopPropagation();
    setFavoriteRoomIds(prev => {
      const next = prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId];
      localStorage.setItem('fav_rooms', JSON.stringify(next));
      return next;
    });
  };

  // Filtered computed values (previously in useRoleplay)
  const filteredCharacters = chars.characters.filter(c =>
    c.name.toLowerCase().includes(ui.searchCharsQuery.toLowerCase()) ||
    (c.personality && c.personality.toLowerCase().includes(ui.searchCharsQuery.toLowerCase()))
  );

  const filteredRooms = chat.rooms.filter(r => {
    const q = (ui.searchRoomsQuery || '').toLowerCase();
    const matchesSearch = !q || (
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.bots && r.bots.some(b => b.name.toLowerCase().includes(q)))
    );
    if (!matchesSearch) return false;

    if (activeRoomFilter === 'groups') return r.is_group;
    if (activeRoomFilter === 'favorites') return favoriteRoomIds.includes(r.id);
    return true;
  });

  const filteredWorlds = lw.worlds.filter(w => {
    const q = (ui.searchWorldsQuery || '').toLowerCase();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      (w.description && w.description.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <div
          className="logo cursor-pointer"
          onClick={() => {
            chat.setCurrentRoomId(null);
            ui.setActiveWorldDetail(false);
          }}
          title="Return to Home"
        >
          <DarfLogo size={40} style={{ marginRight: '2px' }} />
          <span className="logo-text">Darf UI</span>
          {/* <span className="logo-tag">V1.0-beta</span> */}
        </div>
      </div>

      {/* Tab Switchers */}
      <div className="tab-container">
        <button id="tab-chars" className={`tab-btn ${ui.activeTab === 'chars' ? 'active' : ''}`} onClick={() => ui.setActiveTab('chars')}>
          <Heart className="tab-icon" size={16} /><span>Characters</span>
        </button>
        <button id="tab-rooms" className={`tab-btn ${ui.activeTab === 'rooms' ? 'active' : ''}`} onClick={() => ui.setActiveTab('rooms')}>
          <MessageCircle className="tab-icon" size={16} /><span>Chats</span>
        </button>
        <button id="tab-lore" className={`tab-btn ${ui.activeTab === 'lore' ? 'active' : ''}`} onClick={() => ui.setActiveTab('lore')}>
          <BookHeart className="tab-icon" size={16} /><span>Lore</span>
        </button>
      </div>

      {/* CHARACTERS TAB */}
      <div id="content-chars" className={`tab-content ${ui.activeTab === 'chars' ? 'active' : ''}`}>
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
          <label htmlFor="import-tavern-input" className="primary-btn cursor-pointer">
            <Upload size={16} /> Import Card
            <input
              type="file"
              id="import-tavern-input"
              accept="image/png"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  const char = await chars.handleTavernImport(file);
                  toast.success(`Successfully imported: ${char.name}!`);
                } catch (err) {
                  toast.error(`Import failed: ${err.message}`);
                } finally {
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
        <div className="search-bar-row">
          <div className="search-bar" style={{ flex: 1 }}>
            <Search className="search-icon" size={14} />
            <input
              type="text"
              id="search-chars-input"
              placeholder="Search characters..."
              value={ui.searchCharsQuery}
              onChange={(e) => ui.setSearchCharsQuery(e.target.value)}
            />
          </div>
          <button
            className="char-view-toggle-btn"
            title={charViewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
            onClick={() => setCharViewMode(m => m === 'grid' ? 'list' : 'grid')}
          >
            {charViewMode === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
          </button>
        </div>
        <div
          id="character-list"
          className="character-list-scroll-container scrollbar-custom"
        >
          {filteredCharacters.length === 0 ? (
            <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No characters yet. Import a Tavern card or create one!
            </div>
          ) : charViewMode === 'grid' ? (
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
                    {/* Floating Action Overlays */}
                    <div className="char-card-actions">
                      <button
                        className="icon-btn text-muted btn-edit-char"
                        title="Edit Character"
                        onClick={(e) => {
                          e.stopPropagation();
                          chars.handleEditCharacterClick(c, ui.setActiveModal);
                        }}
                      >
                        <Edit3 style={{ width: '12px', height: '12px' }} />
                      </button>
                      <button
                        className="icon-btn danger btn-del-char"
                        title="Delete Character"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await showConfirm(`Are you sure you want to delete ${c.name}?`);
                          if (!ok) return;
                          try { await chars.handleDeleteCharacter(c.id); toast.success(`${c.name} deleted.`); }
                          catch { toast.error('Failed to delete character'); }
                        }}
                      >
                        <Trash style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>

                    {/* Character Full-Card Background Image */}
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

                    {/* Glassmorphic Overlay Panel at the bottom */}
                    <div className="char-card-overlay-container">
                      {/* Integrated Name Overlay */}
                      <h4 className="char-card-name">{c.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // LIST VIEW MODE
            <div className="character-list-mode">
              {filteredCharacters.map(c => {
                let traits = [];
                if (c.personality) {
                  const match = c.personality.match(/\[Tags:\s*([^\]]*)\]/);
                  if (match) {
                    traits = match[1].split(',').map(t => t.trim()).filter(Boolean);
                  }
                }
                // Dynamically fit tags inside the list item based on character length
                const { finalTraits, overflowCount } = fitTraitsByLength(traits, 32);
                const colors = ['pink', 'blue', 'purple'];

                return (
                  <div
                    key={c.id}
                    id={`char-list-${c.id}`}
                    className="char-list-item animate-fade-in"
                    onClick={() => chat.handleStartSingleChat(c, ui.setActiveModal, ui.setActiveTab, ui.setActiveWorldDetail)}
                  >
                    {/* Left avatar */}
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

                    {/* Center Name & Badges */}
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

                    {/* Right Actions on Hover */}
                    <div className="char-list-actions">
                      <button
                        className="icon-btn text-muted btn-edit-char"
                        title="Edit Character"
                        onClick={(e) => {
                          e.stopPropagation();
                          chars.handleEditCharacterClick(c, ui.setActiveModal);
                        }}
                      >
                        <Edit3 style={{ width: '12px', height: '12px' }} />
                      </button>
                      <button
                        className="icon-btn danger btn-del-char"
                        title="Delete Character"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await showConfirm(`Are you sure you want to delete ${c.name}?`);
                          if (!ok) return;
                          try { await chars.handleDeleteCharacter(c.id); toast.success(`${c.name} deleted.`); }
                          catch { toast.error('Failed to delete character'); }
                        }}
                      >
                        <Trash style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ROOMS TAB */}
      <div id="content-rooms" className={`tab-content ${ui.activeTab === 'rooms' ? 'active' : ''}`} style={{ position: 'relative' }}>
        <div className="search-bar">
          <Search className="search-icon" size={14} />
          <input
            type="text"
            id="search-rooms-input"
            placeholder="Search chats..."
            value={ui.searchRoomsQuery}
            onChange={(e) => ui.setSearchRoomsQuery(e.target.value)}
          />
        </div>

        {/* Filter Tags */}
        <div className="filter-tags-row">
          <button
            className={`filter-tag-btn ${activeRoomFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveRoomFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tag-btn ${activeRoomFilter === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveRoomFilter('groups')}
          >
            Groups
          </button>
          <button
            className={`filter-tag-btn ${activeRoomFilter === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveRoomFilter('favorites')}
          >
            Favourites
          </button>
        </div>

        <div id="room-list" className="room-vertical-list scrollbar-custom">
          {filteredRooms.length === 0 ? (
            <div className="room-list-empty-state animate-fade-in">
              {ui.searchRoomsQuery ? (
                <>
                  <div className="empty-state-icon-wrapper">
                    <Search size={36} className="empty-state-icon" />
                  </div>
                  <p className="empty-state-text">No matching chats</p>
                  <p className="empty-state-subtext">Try refining your search query</p>
                </>
              ) : (
                <>
                  {activeRoomFilter === 'all' && (
                    <>
                      <div className="empty-state-icon-wrapper">
                        <MessageCircle size={36} className="empty-state-icon" />
                      </div>
                      <p className="empty-state-text">You don't have any chats yet</p>
                      <p className="empty-state-subtext">Start a conversation with a character!</p>
                    </>
                  )}
                  {activeRoomFilter === 'groups' && (
                    <>
                      <div className="empty-state-icon-wrapper">
                        <Users size={36} className="empty-state-icon" />
                      </div>
                      <p className="empty-state-text">You don't have any groups yet</p>
                      <p className="empty-state-subtext">Create a group chat to talk to multiple characters</p>
                    </>
                  )}
                  {activeRoomFilter === 'favorites' && (
                    <>
                      <div className="empty-state-icon-wrapper">
                        <Heart size={36} className="empty-state-icon" />
                      </div>
                      <p className="empty-state-text">You don't have any favourites yet</p>
                      <p className="empty-state-subtext">Mark a chat as favourite to see it here</p>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            filteredRooms.map(r => {
              const isActiveRoom = r.id === chat.currentRoomId;
              const firstBot = r.bots?.[0];
              const lastMsgText = r.last_message 
                ? `${r.last_message.sender_name}: ${r.last_message.content}`
                : (r.bots?.map(b => b.name)?.join(', ') || '—');

              const isFav = favoriteRoomIds.includes(r.id);

              return (
                <div
                  key={r.id}
                  id={`room-item-${r.id}`}
                  className={`room-item ${isActiveRoom ? 'active' : ''}`}
                  onClick={() => chat.handleEnterRoom(r.id, ui.setActiveModal, false, ui.setActiveTab, ui.setActiveWorldDetail)}
                >
                  {/* Avatar */}
                  <div className="room-avatar-wrap">
                    {r.is_group && r.bots?.length > 1 ? (
                      /* Group: stacked overlapping circles in dynamic layouts */
                      <div className={`room-avatar-stack count-${Math.min(r.bots.length, 4)}`}>
                        {r.bots.length <= 4 ? (
                          r.bots.map((b, i) => (
                            <div key={i} className="room-avatar-stacked-circle">
                              {b.avatar
                                ? <img src={b.avatar} alt={b.name} />
                                : <UserIcon size={11} />
                              }
                            </div>
                          ))
                        ) : (
                          <>
                            {r.bots.slice(0, 3).map((b, i) => (
                              <div key={i} className="room-avatar-stacked-circle">
                                {b.avatar
                                  ? <img src={b.avatar} alt={b.name} />
                                  : <UserIcon size={11} />
                                }
                              </div>
                            ))}
                            <div className="room-avatar-stacked-circle room-avatar-extra">
                              +{r.bots.length - 4}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Solo: single large round avatar */
                      <div className="room-avatar-main">
                        {firstBot?.avatar
                          ? <img src={firstBot.avatar} alt={firstBot.name} />
                          : <UserIcon size={20} />
                        }
                      </div>
                    )}
                  </div>

                  {/* Text body */}
                  <div className="room-item-body">
                    <div className="room-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="room-item-name">{r.name}</span>
                      <Heart
                        size={12}
                        style={{
                          cursor: 'pointer',
                          marginLeft: '8px',
                          color: isFav ? 'var(--pink)' : 'var(--text-sec)',
                          fill: isFav ? 'var(--pink)' : 'none',
                          transition: 'all 0.2s ease',
                          opacity: isFav ? 1 : 0.4
                        }}
                        onClick={(e) => toggleFavoriteRoom(r.id, e)}
                        title={isFav ? "Remove from Favourites" : "Add to Favourites"}
                      />
                    </div>
                    <div className="room-item-row">
                      <span className="room-item-preview">{lastMsgText}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Squircle overlay button */}
        <button
          id="btn-new-room-floating"
          className="floating-squircle-btn"
          title="New Chat"
          onClick={() => {
            chat.setRoomForm({ name: '', selectedCharIds: new Set() });
            ui.setActiveModal('room');
          }}
        >
          <MessageSquarePlus size={24} />
        </button>
      </div>

      {/* LOREBOOK TAB */}
      <div id="content-lore" className={`tab-content ${ui.activeTab === 'lore' ? 'active' : ''}`}>
        <div className="action-bar">
          <button
            id="btn-new-world"
            className="primary-btn full-width"
            onClick={() => {
              lw.setWorldForm({ name: '', description: '' });
              ui.setActiveModal('world');
            }}
          >
            <Globe size={16} /> New World
          </button>
        </div>
        <div className="search-bar">
          <Search className="search-icon" size={14} />
          <input
            type="text"
            id="search-worlds-input"
            placeholder="Search worlds..."
            value={ui.searchWorldsQuery}
            onChange={(e) => ui.setSearchWorldsQuery(e.target.value)}
          />
        </div>
        <div id="world-list" className="world-vertical-list scrollbar-custom">
          {filteredWorlds.length === 0 ? (
            <div className="text-center mt-20" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {lw.worlds.length === 0
                ? "No worlds yet. Create one to begin!"
                : "No worlds match your search."}
            </div>
          ) : (
            filteredWorlds.map((w, idx) => {
              const worldLaws = lw.lore.filter(e => e.world_id === w.id);
              return (
                <div
                  key={idx}
                  className="world-card animate-fade-in"
                  onClick={() => { lw.setCurrentWorldId(w.id); ui.setActiveWorldDetail(true); }}
                >
                  <div className="world-card-icon"><Globe size={16} /></div>
                  <div className="world-card-body">
                    <h4>{w.name}</h4>
                    <p>{worldLaws.length} world {worldLaws.length === 1 ? 'law' : 'laws'} &bull; {worldLaws.filter(e => e.is_active).length} active</p>
                  </div>
                  <div className="world-card-badge"><ChevronRight size={16} /></div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 'var(--border-width) solid var(--border)', background: 'var(--purple)', padding: '0 12px' }}>
        <div className={`connection-status ${settings.engineOnline ? 'online' : 'offline'}`} id="status-indicator" style={{ borderTop: 'none', padding: '12px 4px', background: 'transparent', flex: 1 }}>
          <span className="status-dot"></span>
          <span id="status-text">{settings.engineStatus}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button
            id="btn-toggle-theme"
            className="sidebar-footer-btn"
            title={ui.theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={ui.toggleTheme}
          >
            {ui.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            id="btn-open-settings"
            className="sidebar-footer-btn"
            title="System Settings"
            onClick={() => ui.setActiveModal('settings')}
          >
            <SettingsIcon size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
