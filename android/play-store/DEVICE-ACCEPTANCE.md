# Required device acceptance

Record device/model, Android/WebView version, APK SHA-256, build commit, steps and observed result. Do not tick based only on compilation.

- First launch; home/navigation/back/rotation/keyboard; no clipped controls at phone/tablet widths.
- Cold launch without network: promised offline functions available, online functions fail with a useful retry and preserve local data.
- Create real app records, close/reopen, verify persistence. App update preserves the database; uninstall/clear-data warning is clear.
- Import valid/invalid/oversized files, deny/cancel picker/camera permissions; no crash or silent data loss.
- Export real PDF/CSV/backup, save through Android document picker, open the saved file in another app, share it, and verify cancellation is harmless.
- Sensitive content is not uploaded before the user's explicit upload/share action. Foreign pages cannot reach the native bridge.
- ScreenNote: fresh consent each capture, screen-only/mic, cancel/deny, notification Stop, duration/file cap, rotation, lock, background, task/process termination, playable MP4, native-to-editor import, publish/view/reply/delete synthetic cloud copy.
- InvoiceFlow: customer → invoice → PDF → payment → expense → reports → export/import backup; verify amounts and no duplicated payments.
- ContractCheck: multi-page PDF/photo upload, corrupt rejection, actual free results, entitlement/receipt restoration, exports; no accidental Paystack checkout in this Android test client.
- GreenLight: study → practice → Drive → review → mock → test-day preparation; persistence/offline progress, source links, no in-app PWA-install prompt.

Current status: physical device execution pending. No connected Android phone/emulator is available in the local build environment.
