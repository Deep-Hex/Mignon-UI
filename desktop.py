import multiprocessing
import os
import sys
import threading
import time

import uvicorn
import webview

# Force PyInstaller to bundle the app and all its backend dependencies (FastAPI, Pydantic, etc.)

# Global variable to prevent garbage collection of the Windows named mutex
_app_mutex = None

def check_single_instance():
    """Ensure only one instance of the application is running on Windows using a system-wide named mutex."""
    global _app_mutex
    if sys.platform == "win32":
        import ctypes
        mutex_name = "Global\\DarfUI_SingleInstance_Mutex_5E994B68"
        try:
            # CreateMutexW is a Windows API call that allocates a named system mutex.
            # If the mutex already exists, GetLastError will return ERROR_ALREADY_EXISTS.
            CreateMutex = ctypes.windll.kernel32.CreateMutexW
            GetLastError = ctypes.windll.kernel32.GetLastError
            ERROR_ALREADY_EXISTS = 183

            _app_mutex = CreateMutex(None, False, mutex_name)

            if GetLastError() == ERROR_ALREADY_EXISTS:
                print("[Desktop Launcher] Another instance of Darf UI is already running. Focusing original window and exiting.")

                # Try to locate the existing "Darf UI" window handle
                FindWindowW = ctypes.windll.user32.FindWindowW
                ShowWindow = ctypes.windll.user32.ShowWindow
                SetForegroundWindow = ctypes.windll.user32.SetForegroundWindow

                hwnd = FindWindowW(None, "Darf UI")
                if hwnd:
                    # Restore window if minimized (SW_RESTORE = 9)
                    ShowWindow(hwnd, 9)
                    # Bring window to foreground
                    SetForegroundWindow(hwnd)
                else:
                    # Fallback if window is not yet fully initialized/created during startup
                    MessageBox = ctypes.windll.user32.MessageBoxW
                    MessageBox(None, "Another instance of Darf UI is already running.", "Darf UI", 0x40 | 0x0)  # MB_OK | MB_ICONINFORMATION
                sys.exit(0)
        except Exception as exc:
            print(f"[Desktop Launcher] Warning: Single instance check failed: {exc}")

def start_fastapi():
    """Start the FastAPI backend server using Uvicorn."""
    # Ensure background server runs quietly without hot-reloading
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="warning",
        reload=False
    )

if __name__ == "__main__":
    # Required for PyInstaller + multiprocessing support on Windows
    multiprocessing.freeze_support()

    # Enforce single instance constraint on Windows
    check_single_instance()

    # When frozen, change the current working directory to the directory of the executable
    # so that the SQLite darf.db database and LanceDB lancedb/ folder are read/written
    # right next to the user's .exe rather than in the temporary extraction folder.
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        os.chdir(exe_dir)
        print(f"[Desktop Launcher] Running in frozen package. CWD set to: {exe_dir}")
    else:
        print(f"[Desktop Launcher] Running in development mode. CWD is: {os.getcwd()}")

    # Create and start the FastAPI background server thread
    server_thread = threading.Thread(target=start_fastapi, daemon=True)
    server_thread.start()

    # Wait briefly for the FastAPI server to initialize and bind to port 8000
    time.sleep(1.2)

    print("[Desktop Launcher] Spawning Edge WebView2 GUI window pointing to http://127.0.0.1:8000 ...")

    # Open the webview window
    webview.create_window(
        title="Darf UI",
        url="http://127.0.0.1:8000",
        width=1280,
        height=800,
        resizable=True,
        min_size=(900, 600)
    )

    # Start the webview loop (blocks until the window is closed)
    icon_path = os.path.join(os.getcwd(), "resources", "mascot", "mascot_dark_classic.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join(os.getcwd(), "resources", "mascot", "mascot_dark_classic.ico")

    # Configure persistent webview storage path under the self-contained data directory
    storage_path = os.path.abspath(os.path.join(os.getcwd(), "data", "webview"))
    print(f"[Desktop Launcher] Starting WebView with persistent storage at: {storage_path}")

    if os.path.exists(icon_path):
        print(f"[Desktop Launcher] Setting window taskbar icon to: {icon_path}")
        webview.start(icon=icon_path, private_mode=False, storage_path=storage_path)
    else:
        webview.start(private_mode=False, storage_path=storage_path)

    print("[Desktop Launcher] Window closed. Exiting Darf UI desktop shell.")
    os._exit(0)
