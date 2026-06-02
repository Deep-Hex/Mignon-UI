

#!/bin/bash
# Darf UI macOS & Linux Auto-Installer

echo -e "\033[1;35m"
echo "==================================================================="
echo "                            ✦ DARF UI INSTALLER ✦"
echo "==================================================================="
echo -e "\033[0m"

# 1. Verify Node.js
HAS_NODE=1
if ! command -v node &> /dev/null; then
    HAS_NODE=0
    if [ -f "static/index.html" ]; then
        echo -e "\033[1;33m[INFO]: Node.js was not detected, but pre-compiled static assets were found.\033[0m"
        echo -e "\033[1;33m        Darf UI will run in high-performance portable mode (no npm required).\033[0m"
    else
        echo -e "\033[1;31m[ERROR]: Node.js was not found! Please install Node.js (v18+) from: https://nodejs.org\033[0m"
        exit 1
    fi
fi
if [ "$HAS_NODE" = "1" ]; then
    echo -e "\033[1;32m[OK]: Node.js detected.\033[0m"
fi

# 2. Verify Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "\033[1;31m[ERROR]: Python 3 was not found! Please install Python (v3.10+).\033[0m"
    exit 1
fi
echo -e "\033[1;32m[OK]: Python detected.\033[0m"

echo ""
echo "==================================================================="
echo "[SYSTEM]: Creating Python virtual environment..."
echo "==================================================================="
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "\033[1;32m[OK]: Virtual environment created.\033[0m"
else
    echo "[INFO]: venv folder already exists. Skipping."
fi

echo ""
echo "==================================================================="
echo "[SYSTEM]: Installing Python packages inside venv..."
echo "==================================================================="
./venv/bin/python -m pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "\033[1;31m[ERROR]: Failed to install Python dependencies!\033[0m"
    exit 1
fi
echo -e "\033[1;32m[OK]: Python packages installed successfully.\033[0m"

if [ "$HAS_NODE" = "1" ]; then
    echo ""
    echo "==================================================================="
    echo "[SYSTEM]: Installing Frontend Node dependencies..."
    echo "==================================================================="
    npm install
    if [ $? -ne 0 ]; then
        echo -e "\033[1;31m[ERROR]: Failed to install Node dependencies!\033[0m"
        exit 1
    fi
    echo -e "\033[1;32m[OK]: Node modules installed successfully.\033[0m"
else
    echo ""
    echo -e "\033[1;33m[INFO]: Skipping npm install because Node.js is not present (portable mode active).\033[0m"
fi

echo ""
echo "==================================================================="
echo "[SYSTEM]: Setting launcher file execution permissions..."
echo "==================================================================="
chmod +x start.command start.sh install.command install.sh install.command 2>/dev/null
echo -e "\033[1;32m[OK]: Permissions set successfully.\033[0m"

echo -e "\033[1;35m"
echo "==================================================================="
echo "                  ✦ INSTALLATION COMPLETE SUCCESS ✦"
echo "==================================================================="
echo -e "\033[0m"
echo -e "\033[1;32m[SUCCESS]: Darf UI is fully configured and ready!\033[0m"
echo ""
echo "To start the sandbox:"
echo "  - On macOS: Double-click \"start.command\" in Finder."
echo "  - On Linux: Run \"./start.sh\" in terminal, or double-click \"start.sh\"."
echo "==================================================================="
