; installer.nsh — offer an opt-in "Create desktop shortcut" checkbox on the
; NSIS finish page. Gotchas baked in: use ${APP_FILENAME}.exe, reference the
; shortcut function from inside customFinishPage, and guard the top-level
; Function out of the uninstaller pass (NSIS warning 6010 is fatal to builder).

!ifndef BUILD_UNINSTALLER
  Function CreateDesktopShortcutFn
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${APP_FILENAME}.exe"
  FunctionEnd
!endif

!macro customFinishPage
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcutFn
  !define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_FILENAME}.exe"
  !define MUI_FINISHPAGE_RUN_TEXT "Launch ${PRODUCT_NAME}"
!macroend
