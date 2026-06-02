# ✦ Darf UI ✦

```
✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦
        ██████╗  █████╗ ██████╗ ███████╗   ██╗   ██╗██╗
        ██╔══██╗██╔══██╗██╔══██╗██╔════╝   ██║   ██║██║
        ██║  ██║███████║██████╔╝█████╗     ██║   ██║██║
        ██║  ██║██╔══██║██╔══██║██╔══╝     ██║   ██║██║
        ██████╔╝██║  ██║██║  ██║██║        ╚██████╔╝██║
        ╚══════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝         ╚═════╝ ╚═╝
✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦ ─── ✦
```

> **The Ultra-Premium, Offline-First Local AI Roleplay Sandbox & Cognitive Storytelling Engine.**
> Designed for completely private, uncensored, immersive storytelling, optimized to extract maximum performance out of standard consumer gaming laptops (e.g., **6GB VRAM and 16GB RAM** hardware footprints) using serverless vector databases and advanced local offloading strategies.

---

## 🎨 Core Pillars & Capabilities

| Pillar | Technical Solution | Developer Benefit |
| :--- | :--- | :--- |
| **Absolute Privacy** | 100% Local SQLite Relational Store + Local LanceDB vector engines on CPU | Zero cloud API dependencies, zero leaks, and completely offline execution. |
| **Episodic Horizon Memory** | Chronicle Memory Book (Milestone chapters) + CPU-bound LanceDB semantic retrieval | Smart memory indexing that scales infinitely without bloating active GPU context. |
| **Cognitive Turn Allocation** | Sociolinguistic Turn-Taking (TES Heuristics) & Spatial Proximity filters | Multiple AI characters interact dynamically with zero conversational monologues. |
| **Aesthetic UI** | Modular CSS Design Tokens system with HSL dynamic theme swappers | Ultra-premium, hardware-accelerated aesthetic layers with instant custom theme loaders. |
| **Drag & Snap Canvas** | Absolute React Viewport canvas with 2D transformations & 30px snapping | Gamified layout decals that snap to active sidebars or chat bubble borders. |

---

## 📦 Installation & Setup

We provide multiple installation targets depending on your operating system and technical workflow:

### 📋 Prerequisites (For Options B & C)
If you are running the scripts launcher (**Option B**) or manual setup (**Option C**), ensure you have the following installed on your system:
* **Node.js** (v18.0.0 or higher)
* **Python** (v3.10 to v3.12; v3.11 recommended)
* **Local AI Host**: **Ollama** or **Kobold.cpp** running in the background.

> [!NOTE]
> **Option A (Standalone Windows Installer)** is completely zero-dependency and does **not** require manual Node.js, Python, or Git setups!

---

### 🔷 Option A: Standalone Windows Desktop Installer (.exe)

The easiest way to run Darf UI on Windows without installing manual development dependencies:
1. Run the native installation wizard: **`DarfUI-Setup.exe`**
2. Follow the standard wizard prompts to install Darf UI into your native programs directory.
3. Launch directly via the **Desktop Shortcut** or **Start Menu** mascott link.
4. **App Shell Experience**: The app boots natively inside a lightweight, borderless frame utilizing **Microsoft Edge WebView2** (via PyWebView), completely eliminating browser tab clutter, and runs all local API and database tasks silently in the background.

---

### 🔷 Option B: One-Click Scripts Launcher (Multi-Platform / Developer)
Use preconfigured scripts to automatically verify prerequisites, build local Python virtual environments (`venv`), compile schemas, and launch the concurrent development servers:

1. Extract the workspace files into a clean project directory.
2. Double-click or execute the setup file corresponding to your operating system, then run the startup shortcut:

| OS | Initial Automated Setup | Local Startup Action | CLI Startup Command |
| :--- | :--- | :--- | :--- |
| 🛡️ **Windows** | Double-click **`install.bat`** | Double-click **`start.bat`** | `npm run start` |
| 🍎 **macOS** | Double-click **`install.command`** | Double-click **`start.command`** | `npm run start` |
| 🐧 **Linux** | Run standard terminal script | Run standard shell shortcut | `./start.sh` or `npm run start` |

> [!TIP]
> The scripts launcher automatically spawns a **standalone web browser session** opening directly to `http://localhost:5173`. Keep the terminal window active during play; press `Ctrl+C` to cleanly exit all server instances.

---

### 🔷 Option C: Manual Terminal Configuration
If you prefer to configure your sandbox manually inside a custom terminal session:

#### Step 1: Initialize the Python Virtual Environment
```bash
python -m venv venv
```
> [!NOTE]
> Do NOT activate the virtual environment manually. The Darf UI launcher (`scripts/start-api.cjs`) automatically resolves the native executable venv path on all platforms.

#### Step 2: Install Python Packages
```bash
# On Windows:
venv\Scripts\pip install -r requirements.txt

# On macOS/Linux:
venv/bin/pip install -r requirements.txt
```

#### Step 3: Install Frontend Node Packages
```bash
npm install
```

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**. See the [LICENSE](LICENSE) file for complete details.


