#!/usr/bin/env bash
set -euo pipefail
mkdir -p android/emulator-evidence
# The CI runner uses a software GPU (swiftshader). Under it the bundled launcher can
# raise an "isn't responding" ANR dialog that overlays the acceptance screenshot and
# makes working offline behaviour look like an app failure. Stop the launcher before
# each run so the app is the foreground window, then fail the build if a system dialog
# is still present when the evidence is collected.
quieten_launcher() {
  for pkg in com.google.android.apps.nexuslauncher com.android.launcher3; do
    adb shell am force-stop "$pkg" >/dev/null 2>&1 || true
  done
}
assert_no_system_dialog() {
  local mode="$1"
  adb shell uiautomator dump /sdcard/window-dump.xml >/dev/null 2>&1 || return 0
  if adb shell cat /sdcard/window-dump.xml 2>/dev/null | grep -qiE "isn.t responding|has stopped"; then
    echo "::error::A system ANR dialog was on screen during ${mode} acceptance evidence; the screenshot is contaminated."
    return 1
  fi
  return 0
}
run_mode() {
  local mode="$1" result=0
  quieten_launcher
  ./android/gradlew -p android --no-daemon connectedDebugAndroidTest || result=$?
  if ! adb pull /sdcard/Pictures/AndroidAcceptance android/emulator-evidence/; then
    if [ "$result" = 0 ]; then return 1; fi
  fi
  if [ -d android/app/build/reports/androidTests/connected ]; then
    cp -R android/app/build/reports/androidTests/connected "android/emulator-evidence/${mode}-reports"
  fi
  assert_no_system_dialog "$mode" || result=1
  return "$result"
}
run_mode phone
adb shell wm size 1600x2560
adb shell wm density 240
run_mode tablet
