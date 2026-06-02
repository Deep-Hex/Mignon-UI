import React from 'react';

// Context import
import { RoleplayProvider } from './context/RoleplayContext';
import { useChatContext } from './context/ChatContext';
import { useUIContext } from './context/UIContext';

// Subcomponents import
import Sidebar from './components/Layout/Sidebar';
import ChatView from './components/Chat/ChatView';
import WorldDetail from './components/Worlds/WorldDetail';
import LandingView from './components/Layout/LandingView';

// Modals import (Lazy loaded)
const SettingsModal = React.lazy(() => import('./components/Modals/SettingsModal'));
const CharacterModal = React.lazy(() => import('./components/Modals/CharacterModal'));
const RoomModal = React.lazy(() => import('./components/Modals/RoomModal'));
const LoreModal = React.lazy(() => import('./components/Modals/LoreModal'));
const MemoryModal = React.lazy(() => import('./components/Modals/MemoryModal'));
const WorldModal = React.lazy(() => import('./components/Modals/WorldModal'));
const PersonaPickerModal = React.lazy(() => import('./components/Modals/PersonaPickerModal'));
import UIStickerCanvas from './components/UIStickers/UIStickerCanvas';

function MainLayout() {
  const chat = useChatContext();
  const ui = useUIContext();

  return (
    <div className="app-container">

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Area */}
      <main className="chat-workspace" id="main-workspace">

        {/* World Detail Panel */}
        {ui.activeWorldDetail && <WorldDetail />}

        {/* Landing Hub */}
        <LandingView show={!chat.activeRoom && !ui.activeWorldDetail} />

        {/* Active Chat Conversation Panel */}
        {!ui.activeWorldDetail && <ChatView />}
      </main>

      {/* Forms Overlay Modals */}
      <React.Suspense fallback={null}>
        <SettingsModal isOpen={ui.activeModal === 'settings'} />
        <CharacterModal isOpen={ui.activeModal === 'character'} />
        <RoomModal isOpen={ui.activeModal === 'room'} />
        <LoreModal isOpen={ui.activeModal === 'lore'} />
        <MemoryModal isOpen={ui.activeModal === 'memories'} />
        <WorldModal isOpen={ui.activeModal === 'world'} />
        <PersonaPickerModal isOpen={ui.activeModal === 'persona-picker'} />
      </React.Suspense>
      <UIStickerCanvas />

    </div>
  );
}

export default function App() {
  return (
    <RoleplayProvider>
      <MainLayout />
    </RoleplayProvider>
  );
}
