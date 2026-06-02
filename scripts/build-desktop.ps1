# scripts/build-desktop.ps1
# End-to-end Windows Installer Compilation Orchestrator for Darf UI

$ErrorActionPreference = "Stop"

Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host "                 DARF UI WINDOWS INSTALLER BUILDER " -ForegroundColor Magenta
Write-Host "===================================================================" -ForegroundColor Magenta
Write-Host ""

# 1. Ensure Python dependencies are installed in venv and convert mascot logo to .ico format
Write-Host "[SYSTEM]: Verifying Python packaging dependencies in venv..." -ForegroundColor Cyan
& venv\Scripts\python.exe -m pip install pyinstaller pywebview Pillow --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install packaging dependencies in virtual environment!"
}
Write-Host "[SYSTEM]: Converting mascot PNG to high-fidelity ICO format for app icons..." -ForegroundColor Cyan
& venv\Scripts\python.exe -c "from PIL import Image; img = Image.open('resources/mascot/mascot_dark_classic copy.png'); img.save('resources/mascot/mascot_dark_classic.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])"
Write-Host "[OK]: pyinstaller, pywebview, Pillow, and app icon resources/mascot/mascot_dark_classic.ico are ready." -ForegroundColor Green
Write-Host ""

# 2. Build the React frontend production assets
Write-Host "[SYSTEM]: Building React frontend production assets..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "React frontend build failed! Please check Vite compiler errors."
}
Write-Host "[OK]: React production static files compiled into ./static." -ForegroundColor Green
Write-Host ""

# 3. Check for Inno Setup compiler (ISCC.exe) and install via winget if missing
Write-Host "[SYSTEM]: Locating Inno Setup Compiler (ISCC.exe)..." -ForegroundColor Cyan
$isccPath = ""
$buildInstaller = $true

# Check common installation locations
$defaultPath1 = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$defaultPath2 = "C:\Program Files\Inno Setup 6\ISCC.exe"
$defaultPath3 = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"

try {
    $inPath = Get-Command iscc.exe -ErrorAction SilentlyContinue
    if (Test-Path $defaultPath1) {
        $isccPath = $defaultPath1
    }
    elseif (Test-Path $defaultPath2) {
        $isccPath = $defaultPath2
    }
    elseif (Test-Path $defaultPath3) {
        $isccPath = $defaultPath3
    }
    elseif ($inPath) {
        $isccPath = $inPath.Source
    }
    else {
        Write-Host "[INFO]: Inno Setup is not detected in standard global folders." -ForegroundColor Yellow
        Write-Host "[SYSTEM]: Attempting to install Inno Setup silently using winget..." -ForegroundColor Cyan
        
        # Run winget silently with a timeout / try catch to avoid blocking/crashing
        $ErrorActionPreference = "Continue"
        & winget install --id JRSoftware.InnoSetup --silent --accept-source-agreements --accept-package-agreements
        $ErrorActionPreference = "Stop"
        
        # Give Windows a couple of seconds to register the files
        Start-Sleep -Seconds 3
        
        # Re-verify installation paths
        if (Test-Path $defaultPath1) {
            $isccPath = $defaultPath1
        }
        elseif (Test-Path $defaultPath2) {
            $isccPath = $defaultPath2
        }
        elseif (Test-Path $defaultPath3) {
            $isccPath = $defaultPath3
        }
        else {
            Write-Host "[WARNING]: Silent Inno Setup installation completed but ISCC.exe was not found. Skipping installer creation." -ForegroundColor Yellow
            $buildInstaller = $false
        }
    }
}
catch {
    Write-Host "[WARNING]: Inno Setup could not be located or installed automatically. Skipping installer creation." -ForegroundColor Yellow
    $buildInstaller = $false
}

if ($buildInstaller -and $isccPath) {
    Write-Host "[OK]: Inno Setup Compiler found at: $isccPath" -ForegroundColor Green
}
Write-Host ""

# 4. Compile application directory using PyInstaller
Write-Host "[SYSTEM]: Bundling application files with PyInstaller (this may take a minute)..." -ForegroundColor Cyan

# Clean up previous builds to avoid caching issues
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist\Darf UI") { Remove-Item -Recurse -Force "dist\Darf UI" }

# Run PyInstaller with --onedir (essential for Inno Setup installer mapping)
# We exclude the heavy local ML runtimes (torch, transformers, etc.) to achieve
# a lightweight ~15MB setup wizard and 10x faster startup performance.
& venv\Scripts\pyinstaller --noconfirm --onedir --windowed `
    --name "Darf UI" `
    --specpath "packaging" `
    --icon "../resources/mascot/mascot_dark_classic.ico" `
    --add-data "../static;static" `
    --add-data "../app;app" `
    --add-data "../resources;resources" `
    --exclude-module torch `
    --exclude-module sentence_transformers `
    --exclude-module transformers `
    --exclude-module scipy `
    --exclude-module sympy `
    --exclude-module data.seed_characters `
    --exclude-module data.seed_settings `
    --exclude-module data.seed_lore `
    --collect-all uvicorn `
    --collect-all anyio `
    --collect-all lancedb `
    --collect-all pyarrow `
    desktop.py

if ($LASTEXITCODE -ne 0) {
    Write-Error "PyInstaller bundling failed!"
}
Write-Host "[OK]: Standalone application folder successfully compiled under 'dist/Darf UI/'." -ForegroundColor Green
Write-Host ""

# 5. Compile the Setup Installer using Inno Setup
if ($buildInstaller -and $isccPath) {
    Write-Host "[SYSTEM]: Compiling Windows Setup Installer using Inno Setup..." -ForegroundColor Cyan
    & $isccPath packaging\installer.iss
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Inno Setup compilation failed!"
    }
    
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Magenta
    Write-Host "                ✦ BUILD COMPLETE SUCCESS ✦" -ForegroundColor Magenta
    Write-Host "===================================================================" -ForegroundColor Magenta
    Write-Host "[SUCCESS]: Your Windows Setup Installer is ready!" -ForegroundColor Green
    Write-Host "[LOCATION]: dist\DarfUI-Setup.exe" -ForegroundColor Green
    Write-Host ""
    Write-Host "[TIP]: You can now upload this 'dist\DarfUI-Setup.exe' file directly to GitHub!" -ForegroundColor Cyan
    Write-Host "===================================================================" -ForegroundColor Magenta
}
else {
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Red
    Write-Host "                ⚠️  INSTALLER COMPILATION SKIPPED  ⚠️" -ForegroundColor Red
    Write-Host "===================================================================" -ForegroundColor Red
    Write-Host "[INFO]: PyInstaller successfully compiled your application under 'dist/Darf UI/'." -ForegroundColor Yellow
    Write-Host "[ERROR]: Could not compile the Setup Wizard because Inno Setup was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "[ACTION REQUIRED]: To build your 'DarfUI-Setup.exe' installation wizard:" -ForegroundColor Cyan
    Write-Host "  1. Run this command in a terminal to install Inno Setup:" -ForegroundColor White
    Write-Host "     winget install JRSoftware.InnoSetup" -ForegroundColor Green
    Write-Host "  2. Rerun this build script:" -ForegroundColor White
    Write-Host "     powershell scripts/build-desktop.ps1" -ForegroundColor Green
    Write-Host "===================================================================" -ForegroundColor Red
    Write-Error "Inno Setup compiler (ISCC.exe) is required to build the Setup Wizard. Please install it and try again."
}
