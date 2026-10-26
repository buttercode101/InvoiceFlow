# Android internal client

This project is a testable Android release candidate, not a claim of Play approval or physical device acceptance. See play-store/ for product-specific listing, data handling, acceptance and console handoff. Package IDs are provisional until first upload. Native app data is separate from Chrome/browser data; use explicit backup/import to migrate.

## Reproducible build

Install JDK 17 and an already licensed Android SDK (API 36 and build-tools 35.0.0), or use the pinned GitHub Android workflow with its runner-provided SDK. For ScreenNote/ContractCheck run npm ci first. No signing secrets are used by CI.

```
node android/prepare.mjs
./android/gradlew -p android assembleDebug testDebugUnitTest lintRelease bundleRelease
node android/release-check.mjs --submission
```

The final check deliberately fails while required release gates remain incomplete. A debug APK is installable for developer testing. The release AAB is UNSIGNED unless private signing configuration is provided and cannot be uploaded as-is. Pin/checksum data and the local-asset manifest tie builds to source. Do not ship a generic wrapper without completing the acceptance flows.

For a controlled signed release provide ANDROID_UPLOAD_KEYSTORE_PATH, ANDROID_UPLOAD_STORE_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS and ANDROID_UPLOAD_KEY_PASSWORD privately. Never commit/upload a key or password, print signing variables, put passwords in command-line arguments or publish signing material in CI artifacts. The developer must retain a private backup. Production signing and Play App Signing enrollment are owner-controlled release steps.

## Native boundary

Only the exact configured HTTPS origin and main frame can send native WebMessages. No wildcard origins or addJavascriptInterface bridge. External websites open in the system browser. Mixed content, cleartext and filesystem URL access are disabled. Native file exports are bounded and use the Android save/share chooser, with temporary content-URI permissions. No all-files-storage permission. Android backup is disabled; explicit product backups remain available.

InvoiceFlow and GreenLight bundle first-launch offline content. ScreenNote bundles its editor and calls the existing online sharing API. ContractCheck bundles its frontend; analysis needs its existing server. Its Android test client gates new Paystack checkout pending a regional billing review. The website checkout is unaffected.

ScreenNote alone includes the native recorder: fresh Android capture consent, foreground notification/stop control, screen-only or microphone audio, private MP4s, a 5-minute/25-MiB cap, recording list and explicit native-to-editor import. It never restarts capture without new consent after service/task termination. System audio and camera overlays are not implemented in this first native recorder and must not be advertised. Physical recording, interruption and media tests remain mandatory.

No Play Console setup, invitations, payments, legal acceptance, upload signing, physical-device tests or publication are implied by this source build.
