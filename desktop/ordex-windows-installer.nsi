Unicode true
!include "MUI2.nsh"

Name "Ordex"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\Ordex"
InstallDirRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "${ICON}"
UninstallIcon "${ICON}"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Ordex"
VIAddVersionKey "FileDescription" "Ordex Installer"
VIAddVersionKey "FileVersion" "1.0.0"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 clorisHHH"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!define MUI_COMPONENTSPAGE_NODESC
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"
LangString DesktopShortcut ${LANG_ENGLISH} "Create a desktop shortcut"
LangString DesktopShortcut ${LANG_SIMPCHINESE} "创建桌面快捷方式"

Section "Ordex" SEC_APP
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "${STAGE}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\Ordex"
  CreateShortCut "$SMPROGRAMS\Ordex\Ordex.lnk" "$INSTDIR\Ordex.exe" "" "$INSTDIR\resources\app\desktop\ordex.ico"
  CreateShortCut "$SMPROGRAMS\Ordex\Uninstall Ordex.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DisplayName" "Ordex"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DisplayIcon" "$INSTDIR\resources\app\desktop\ordex.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "NoRepair" 1
  ReadRegDWORD $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DesktopShortcut"
  StrCmp $0 1 0 +2
    Delete "$DESKTOP\Ordex.lnk"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DesktopShortcut" 0
SectionEnd

Section "$(DesktopShortcut)" SEC_DESKTOP
  CreateShortCut "$DESKTOP\Ordex.lnk" "$INSTDIR\Ordex.exe" "" "$INSTDIR\resources\app\desktop\ordex.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DesktopShortcut" 1
SectionEnd

Section "Uninstall"
  ReadRegDWORD $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex" "DesktopShortcut"
  StrCmp $0 1 0 +2
    Delete "$DESKTOP\Ordex.lnk"
  Delete "$SMPROGRAMS\Ordex\Ordex.lnk"
  Delete "$SMPROGRAMS\Ordex\Uninstall Ordex.lnk"
  RMDir "$SMPROGRAMS\Ordex"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ordex"
  RMDir /r "$INSTDIR\resources\app"
  Delete "$INSTDIR\resources\default_app.asar"
  RMDir "$INSTDIR\resources"
  Delete "$INSTDIR\locales\*.pak"
  RMDir "$INSTDIR\locales"
  Delete "$INSTDIR\Ordex.exe"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\chrome_100_percent.pak"
  Delete "$INSTDIR\chrome_200_percent.pak"
  Delete "$INSTDIR\d3dcompiler_47.dll"
  Delete "$INSTDIR\dxcompiler.dll"
  Delete "$INSTDIR\dxil.dll"
  Delete "$INSTDIR\ffmpeg.dll"
  Delete "$INSTDIR\icudtl.dat"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\LICENSES.chromium.html"
  Delete "$INSTDIR\resources.pak"
  Delete "$INSTDIR\snapshot_blob.bin"
  Delete "$INSTDIR\v8_context_snapshot.bin"
  Delete "$INSTDIR\version"
  Delete "$INSTDIR\vk_swiftshader.dll"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vulkan-1.dll"
  RMDir "$INSTDIR"
SectionEnd
