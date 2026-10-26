#!/usr/bin/env bash
set -euo pipefail
mkdir -p android/emulator-evidence
run_mode() {
  local mode="$1" result=0
  ./android/gradlew -p android --no-daemon connectedDebugAndroidTest || result=$?
  if ! adb pull /sdcard/Pictures/AndroidAcceptance android/emulator-evidence/; then
    if [ "$result" = 0 ]; then return 1; fi
  fi
  if [ -d android/app/build/reports/androidTests/connected ]; then
    cp -R android/app/build/reports/androidTests/connected "android/emulator-evidence/${mode}-reports"
  fi
  return "$result"
}
run_mode phone
adb shell wm size 1600x2560
adb shell wm density 240
run_mode tablet
