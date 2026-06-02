#!/bin/bash
# Linux double-click shortcut.
# Make executable once: chmod +x start.sh
# Then double-click in your file manager (GNOME Files, Dolphin, Thunar, etc.)
# and choose "Run in Terminal" when prompted.
cd "$(dirname "$0")"
npm run start
