import React from 'react';
import Logo from '../UI/Logo';
import { useUIContext } from '../../context/UIContext';
import { APP_NAME } from '../../config';
import { useSettingsContext } from '../../context/SettingsContext';
import { useChatContext } from '../../context/ChatContext';
import { useLoreBookContext } from '../../context/LoreBookContext';
import { useToast } from '../../context/ToastContext';
import SettingsModal from '../Modals/SettingsModal';
import {
  Settings as SettingsIcon, Heart, MessageCircle, BookHeart,
  Sun, Moon, CheckSquare, Edit3, Trash
} from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

// Subcomponents
import CharactersPanel from './CharactersPanel';
import ChatsPanel from './ChatsPanel';
import LorePanel from './LorePanel';

// Utilities
import { getAdjustedCoordinates } from '../../utils/domHelper';

export default function Sidebar() {
  const ui = useUIContext();
  const settings = useSettingsContext();
  const chat = useChatContext();
  const lw = useLoreBookContext();
  const { toast, showConfirm } = useToast();

  const [contextMenu, setContextMenu] = React.useState(null);
  const contextMenuRef = React.useRef(null);

  const trackRef = React.useRef(null);
  const touchStartXRef = React.useRef(null);
  const touchStartYRef = React.useRef(null);
  const touchStartTimeRef = React.useRef(0);
  const baseOffsetRef = React.useRef(0);
  const isSwipingRef = React.useRef(null); // null = undecided, true = swiping tabs, false = scrolling list
  const viewportWidthRef = React.useRef(0);

  useClickOutside(contextMenuRef, () => setContextMenu(null));

  React.useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, []);

  const handleRoomContextMenu = (e, r, actions) => {
    e.preventDefault();
    const adjusted = getAdjustedCoordinates(e.clientX, e.clientY, 150, 120);
    setContextMenu({
      type: 'room',
      room: r,
      actions,
      x: adjusted.x,
      y: adjusted.y
    });
  };

  const handleWorldContextMenu = (e, w, actions) => {
    e.preventDefault();
    const adjusted = getAdjustedCoordinates(e.clientX, e.clientY, 150, 90);
    setContextMenu({
      type: 'world',
      world: w,
      actions,
      x: adjusted.x,
      y: adjusted.y
    });
  };

  const handleTouchStart = (e) => {
    if (!ui.isMobileDevice || !trackRef.current) return;

    const targetTag = e.target.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target.closest('input') || e.target.closest('textarea')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      isSwipingRef.current = false;
      return;
    }

    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    isSwipingRef.current = null;

    const viewport = trackRef.current.parentElement;
    const rect = viewport.getBoundingClientRect();
    viewportWidthRef.current = rect.width || window.innerWidth;

    const tabs = ['chars', 'rooms', 'lore', 'settings'];
    const currentIndex = tabs.indexOf(ui.activeTab);
    baseOffsetRef.current = -currentIndex * viewportWidthRef.current;

    trackRef.current.style.setProperty('transition', 'none', 'important');
  };

  const handleTouchMove = (e) => {
    if (!ui.isMobileDevice || touchStartXRef.current === null || !trackRef.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    if (isSwipingRef.current === null) {
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);
      if (absDiffX > absDiffY && absDiffX > 10) {
        isSwipingRef.current = true;
      } else if (absDiffY > absDiffX && absDiffY > 10) {
        isSwipingRef.current = false;
      }
    }

    if (isSwipingRef.current === true) {
      if (e.cancelable) e.preventDefault();

      let targetOffset = baseOffsetRef.current + diffX;
      const maxOffset = 0;
      const minOffset = -viewportWidthRef.current * 3;

      if (targetOffset > maxOffset) {
        targetOffset = maxOffset;
      } else if (targetOffset < minOffset) {
        targetOffset = minOffset;
      }

      trackRef.current.style.transform = `translateX(${targetOffset}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!ui.isMobileDevice || touchStartXRef.current === null || !trackRef.current) return;

    trackRef.current.style.removeProperty('transition');

    if (isSwipingRef.current === true) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartXRef.current;
      const dragPercentage = diffX / viewportWidthRef.current;
      const duration = Date.now() - touchStartTimeRef.current;
      const isFlick = duration < 250 && Math.abs(diffX) > 30;

      const tabs = ['chars', 'rooms', 'lore', 'settings'];
      const currentIndex = tabs.indexOf(ui.activeTab);

      let targetIndex = currentIndex;

      if (dragPercentage < -0.2 || (isFlick && diffX < 0)) {
        targetIndex = Math.min(currentIndex + 1, tabs.length - 1);
      } else if (dragPercentage > 0.2 || (isFlick && diffX > 0)) {
        targetIndex = Math.max(currentIndex - 1, 0);
      }

      if (targetIndex !== currentIndex) {
        trackRef.current.style.transform = `translateX(${-targetIndex * 25}%)`;
        ui.setActiveTab(tabs[targetIndex]);
      } else {
        trackRef.current.style.transform = `translateX(${-currentIndex * 25}%)`;
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingRef.current = null;
  };

  return (
    <aside
      className="sidebar"
      id="sidebar"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sidebar-header">
        <div
          className="logo cursor-pointer"
          onClick={() => {
            chat.setCurrentRoomId(null);
            ui.setActiveWorldDetail(false);
          }}
          title="Return to Home"
        >
          <Logo size={40} style={{ marginRight: '2px' }} />
          <span className="logo-text">{APP_NAME}</span>
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
        {ui.isMobileDevice && (
          <button id="tab-settings" className={`tab-btn ${ui.activeTab === 'settings' ? 'active' : ''}`} onClick={() => ui.setActiveTab('settings')}>
            <SettingsIcon className="tab-icon" size={16} /><span>Settings</span>
          </button>
        )}
      </div>

      {/* Tab Contents Viewport & Slide Track */}
      <div className="tab-content-viewport">
        <div
          ref={trackRef}
          className="tab-content-track"
          style={{
            transform: `translateX(${ui.isMobileDevice
                ? (ui.activeTab === 'chars' ? '0%' : ui.activeTab === 'rooms' ? '-25%' : ui.activeTab === 'lore' ? '-50%' : '-75%')
                : (ui.activeTab === 'chars' ? '0%' : ui.activeTab === 'rooms' ? '-33.333%' : '-66.666%')
              })`
          }}
        >
          {/* CHARACTERS TAB */}
          <CharactersPanel />

          {/* ROOMS TAB */}
          <ChatsPanel onRoomContextMenu={handleRoomContextMenu} />

          {/* LOREBOOK TAB */}
          <LorePanel onWorldContextMenu={handleWorldContextMenu} />

          {/* MOBILE SETTINGS TAB */}
          {ui.isMobileDevice && (
            <SettingsModal isInline={true} />
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 'var(--border-width) solid var(--border)', background: 'var(--purple)', padding: '0 12px' }}>
        <div className={`connection-status ${settings.engineOnline ? 'online' : 'offline'}`} id="status-indicator" style={{ borderTop: 'none', padding: '12px 4px', background: 'transparent', flex: 1 }}>
          <span className="status-dot"></span>
          <span id="status-text">
            {settings.engineStatus === 'Checking Engine...' ? 'Checking...' : (settings.engineOnline ? 'Online' : 'Offline')}
          </span>
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
            onClick={() => {
              if (ui.isMobileDevice) {
                ui.setActiveTab('settings');
              } else {
                ui.setActiveModal('settings');
              }
            }}
          >
            <SettingsIcon size={15} />
          </button>
        </div>
      </div>

      {/* Global Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu glassmorphism"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10000,
            padding: '8px',
            minWidth: '150px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'room' ? (
            <>
              <button
                className="dropdown-item"
                onClick={() => {
                  contextMenu.actions.setIsSelectionMode(true);
                  contextMenu.actions.setSelectedRoomIds(new Set([contextMenu.room.id]));
                  setContextMenu(null);
                }}
              >
                <CheckSquare size={14} style={{ marginRight: '8px', color: 'var(--pink)' }} /> Select
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  contextMenu.actions.setEditingRoomId(contextMenu.room.id);
                  contextMenu.actions.setEditRoomName(contextMenu.room.name);
                  setContextMenu(null);
                }}
              >
                <Edit3 size={14} style={{ marginRight: '8px', color: 'var(--pink)' }} /> Rename
              </button>
              <button
                className="dropdown-item danger"
                onClick={async () => {
                  const ok = await showConfirm(`Are you sure you want to delete "${contextMenu.room.name}"?`);
                  if (ok) {
                    chat.handleDeleteRoom(contextMenu.room.id);
                    if (chat.currentRoomId === contextMenu.room.id) {
                      chat.setCurrentRoomId(null);
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <Trash size={14} style={{ marginRight: '8px' }} /> Delete
              </button>
            </>
          ) : (
            <>
              <button
                className="dropdown-item"
                onClick={() => {
                  contextMenu.actions.setEditingWorldId(contextMenu.world.id);
                  contextMenu.actions.setEditWorldName(contextMenu.world.name);
                  setContextMenu(null);
                }}
              >
                <Edit3 size={14} style={{ marginRight: '8px', color: 'var(--pink)' }} /> Rename
              </button>
              <button
                className="dropdown-item danger"
                onClick={async () => {
                  const ok = await showConfirm(`Are you sure you want to permanently delete the world "${contextMenu.world.name}"? This will also delete ALL of its associated lorebook entries.`);
                  if (ok) {
                    try {
                      await lw.handleDeleteWorld(contextMenu.world.id);
                      if (ui.activeWorldDetail && lw.currentWorldId === contextMenu.world.id) {
                        ui.setActiveWorldDetail(false);
                      }
                      toast.success('World deleted.');
                    } catch (err) {
                      toast.error(`Error deleting world: ${err.message}`);
                    }
                  }
                  setContextMenu(null);
                }}
              >
                <Trash size={14} style={{ marginRight: '8px' }} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
