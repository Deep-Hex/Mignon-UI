/**
 * RoleplayContext.jsx
 * --------------------
 * Composes all domain context providers into a single provider tree.
 * Components import from their specific domain context instead of this file.
 *
 * Provider order matters — providers that depend on siblings must be nested
 * inside those siblings:
 *   ToastProvider → UIProvider → SettingsProvider → LoreWorldProvider
 *   → CharacterProvider → ChatProvider
 */

import { ToastProvider } from './ToastContext';
import { UIProvider } from './UIContext';
import { SettingsProvider } from './SettingsContext';
import { LoreWorldProvider } from './LoreWorldContext';
import { CharacterProvider } from './CharacterContext';
import { ChatProvider } from './ChatContext';

export function RoleplayProvider({ children }) {
  return (
    <ToastProvider>
      <UIProvider>
        <SettingsProvider>
          <LoreWorldProvider>
            <CharacterProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </CharacterProvider>
          </LoreWorldProvider>
        </SettingsProvider>
      </UIProvider>
    </ToastProvider>
  );
}
