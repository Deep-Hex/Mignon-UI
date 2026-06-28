import React from 'react';
import { Search, X, Trash, MessageCircle, Users, Heart, MessageSquarePlus, User as UserIcon, CheckSquare, Square } from 'lucide-react';
import { useUIContext } from '../../context/UIContext';
import { useChatContext } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function cleanPreviewText(text) {
  if (!text) return '';
  let cleaned = text.replace(/\*\*([\s\S]*?)\*\*/g, '');
  cleaned = cleaned.replace(/\*([\s\S]*?)\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return text.replace(/\*\*|\*/g, '').replace(/\s+/g, ' ').trim();
  }
  return cleaned;
}

export default function ChatsPanel({ onRoomContextMenu }) {
  const ui = useUIContext();
  const chat = useChatContext();
  const { toast, showConfirm } = useToast();

  const [searchRoomsQuery, setSearchRoomsQuery] = React.useState('');
  const [activeRoomFilter, setActiveRoomFilter] = React.useState('all'); // 'all', 'groups', 'favorites'
  const [favoriteRoomIds, setFavoriteRoomIds] = useLocalStorage('fav_rooms', []);

  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState(new Set());
  const [editingRoomId, setEditingRoomId] = React.useState(null);
  const [editRoomName, setEditRoomName] = React.useState('');

  const toggleFavoriteRoom = (roomId, e) => {
    e.stopPropagation();
    setFavoriteRoomIds(prev => prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]);
  };

  const handleSaveRoomRename = async (roomId, oldName) => {
    const trimmed = editRoomName.trim();
    setEditingRoomId(null);
    if (trimmed && trimmed !== oldName) {
      try {
        await chat.handleRenameRoom(roomId, trimmed);
        toast.success(`Chat renamed to "${trimmed}"`);
      } catch (err) {
        toast.error(`Rename failed: ${err.message}`);
      }
    }
  };

  const filteredRooms = chat.rooms.filter(r => {
    const q = (searchRoomsQuery || '').toLowerCase();
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

  return (
    <div id="content-rooms" className={`tab-content ${ui.activeTab === 'rooms' ? 'active' : ''}`} style={{ position: 'relative' }}>
      <div className="search-bar">
        <Search className="search-icon" size={14} />
        <input
          type="text"
          id="search-rooms-input"
          placeholder="Search chats..."
          value={searchRoomsQuery}
          onChange={(e) => setSearchRoomsQuery(e.target.value)}
        />
      </div>

      {!isSelectionMode ? (
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
      ) : (
        <div className="selection-action-bar animate-fade-in" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 12px 16px 12px',
          gap: '8px'
        }}>
          <button
            className="icon-btn"
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedRoomIds(new Set());
            }}
            title="Cancel Selection"
          >
            <X size={16} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
            {selectedRoomIds.size} selected
          </span>
          <button
            className="icon-btn danger"
            disabled={selectedRoomIds.size === 0}
            onClick={async () => {
              const ok = await showConfirm(`Are you sure you want to delete ${selectedRoomIds.size} selected chat(s)?`);
              if (ok) {
                await chat.handleBulkDeleteRooms(Array.from(selectedRoomIds));
                setIsSelectionMode(false);
                setSelectedRoomIds(new Set());
                toast.success(`Deleted ${selectedRoomIds.size} chat(s)`);
              }
            }}
            title="Delete Selected"
          >
            <Trash size={16} />
          </button>
        </div>
      )}

      <div id="room-list" className="room-vertical-list scrollbar-custom">
        {filteredRooms.length === 0 ? (
          <div className="room-list-empty-state animate-fade-in">
            {searchRoomsQuery ? (
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
              ? `${r.last_message.sender_name}: ${cleanPreviewText(r.last_message.content)}`
              : (r.bots?.map(b => b.name)?.join(', ') || '—');

            const isFav = favoriteRoomIds.includes(r.id);

            return (
              <div
                key={r.id}
                id={`room-item-${r.id}`}
                className={`room-item ${isActiveRoom ? 'active' : ''} ${isSelectionMode && selectedRoomIds.has(r.id) ? 'selected-mode-active' : ''}`}
                onClick={() => {
                  if (editingRoomId === r.id) return;
                  if (isSelectionMode) {
                    setSelectedRoomIds(prev => {
                      const next = new Set(prev);
                      if (next.has(r.id)) next.delete(r.id);
                      else next.add(r.id);
                      return next;
                    });
                  } else {
                    chat.handleEnterRoom(r.id, ui.setActiveModal, false, ui.setActiveTab, ui.setActiveWorldDetail);
                  }
                }}
                onContextMenu={(e) => {
                  if (!isSelectionMode) {
                    onRoomContextMenu(e, r, {
                      setIsSelectionMode,
                      setEditingRoomId,
                      setEditRoomName
                    });
                  }
                }}
              >
                {isSelectionMode && (
                  <div style={{ marginRight: '12px', display: 'flex', alignItems: 'center', color: selectedRoomIds.has(r.id) ? 'var(--pink)' : 'var(--text-muted)' }}>
                    {selectedRoomIds.has(r.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                )}
                
                <div className="room-avatar-wrap">
                  {r.is_group && r.bots?.length > 1 ? (
                    <div className={`room-avatar-stack count-${Math.min(r.bots.length, 4)}`}>
                      {r.bots.length <= 4 ? (
                        r.bots.map((b, i) => (
                          <div key={i} className="room-avatar-stacked-circle">
                            {b.avatar ? <img src={b.avatar} alt={b.name} /> : <UserIcon size={11} />}
                          </div>
                        ))
                      ) : (
                        <>
                          {r.bots.slice(0, 3).map((b, i) => (
                            <div key={i} className="room-avatar-stacked-circle">
                              {b.avatar ? <img src={b.avatar} alt={b.name} /> : <UserIcon size={11} />}
                            </div>
                          ))}
                          <div className="room-avatar-stacked-circle room-avatar-extra">
                            +{r.bots.length - 4}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="room-avatar-main">
                      {firstBot?.avatar ? <img src={firstBot.avatar} alt={firstBot.name} /> : <UserIcon size={20} />}
                    </div>
                  )}
                </div>

                <div className="room-item-body">
                  <div className="room-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {editingRoomId === r.id ? (
                      <input
                        type="text"
                        className="rename-input"
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            await handleSaveRoomRename(r.id, r.name);
                          } else if (e.key === 'Escape') {
                            setEditingRoomId(null);
                          }
                        }}
                        onBlur={() => handleSaveRoomRename(r.id, r.name)}
                        autoFocus
                      />
                    ) : (
                      <span className="room-item-name">{r.name}</span>
                    )}
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

      {!isSelectionMode && (
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
      )}
    </div>
  );
}
