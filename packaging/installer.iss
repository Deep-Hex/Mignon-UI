; packaging/installer.iss
; Professional Inno Setup Configuration Script for Darf UI

[Setup]
AppId={{5E994B68-C8F4-4E4A-9A82-C250E80FFAC6}
AppName=Darf UI
AppVersion=1.0.0-beta
AppPublisher=Darf Labs
AppPublisherURL=https://github.com/deepak-raven/Darf-UI
AppSupportURL=https://github.com/deepak-raven/Darf-UI/issues
AppUpdatesURL=https://github.com/deepak-raven/Darf-UI/releases
DefaultDirName={localappdata}\Programs\Darf UI
DisableDirPage=no
DefaultGroupName=Darf UI
DisableProgramGroupPage=yes
DisableReadyPage=yes
OutputDir=..\dist
OutputBaseFilename=DarfUI-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
SetupIconFile=..\resources\mascot\mascot_dark_classic.ico
WizardSmallImageFile=..\resources\mascot\mascot_dark_classic copy.png
UninstallDisplayIcon={app}\Darf UI.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\Darf UI\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Darf UI"; Filename: "{app}\Darf UI.exe"; IconFilename: "{app}\_internal\resources\mascot\mascot_dark_classic.ico"; IconIndex: 0
Name: "{group}\{cm:UninstallProgram,Darf UI}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\Darf UI"; Filename: "{app}\Darf UI.exe"; Tasks: desktopicon; IconFilename: "{app}\_internal\resources\mascot\mascot_dark_classic.ico"; IconIndex: 0

[Run]
Filename: "{app}\Darf UI.exe"; Description: "{cm:LaunchProgram,Darf UI}"; Flags: nowait postinstall skipifsilent
