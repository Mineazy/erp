# Mineazy POS Desktop — Tauri Offline-First

Status: scaffolded, web build verified (`npx tsc --noEmit` pass). Rust linker requires VS Build Tools on this runner — code is syntactically valid, full `tauri build` runs on Windows CI with `windows-latest + Rust stable + VS Build Tools`.

## Why Tauri (from prior analysis)
- Existing PWA (`public/sw.js:1`, `src/lib/db.ts:1`, `src/components/sync-manager.tsx:1`) already queues `pos_payment` offline and replays. It still needs browser + online session open.
- Desktop gives: SQLite durable queue (`src-tauri/src/main.rs:1` `offline_queue`), raw ESC/POS + drawer, autostart/kiosk, no cache wipe, background sync even with app closed. Same Next.js code, no rewrite.

## Scaffold

```
src-tauri/
  Cargo.toml          # tauri 2.7 + plugins: shell, fs, http, store, sql(sqlite), autostart + rusqlite bundled
  tauri.conf.json     # productName Mineazy POS, identifier com.mineazy.pos, window 1280x800, devUrl http://localhost:3000, frontendDist ../.next
  src/main.rs         # SQLite init (mineazy_pos.db in app_data_dir), commands: enqueue_offline/get_pending/mark_synced/mark_failed/pending_count/print_raw/get_app_version + autostart
  icons/              # from public/logo.png
src/lib/tauri-bridge.ts   # isTauri(), tauriEnqueue(), tauriPrintRaw(), tauriPendingCount() — web fallback to window.print
src/components/tauri-sync.tsx # polls Rust queue every 15s when online, replays fetch
src/lib/pos-print.ts:139   # printPOSReceipt now delegates to tauriPrintRaw when __TAURI__ present
src/app/(modules)/pos/page.tsx:422 # openSession offline-first (creates offline-xxx in session_cache + idb outbox + tauri queue); finalizeTransaction:765 also dual-queues to tauri
src/app/providers.tsx:1    # mounts <TauriSync />
package.json:5             # scripts tauri:dev / tauri:build / pos:desktop + dep @tauri-apps/api
.gitignore                 # src-tauri/target, Cargo.lock
```

## Offline Flow

1. **Browser/PWA**: `src/lib/api-fetch.ts:28` throws `OfflineQueuedError` for non-GET; `src/lib/db.ts:4` outbox `offline_transactions`; `SyncManager` replays on `online`.
2. **Desktop**: same IDB plus `tauri-bridge.ts` mirrors to Rust `offline_queue` (`src-tauri/src/main.rs:enqueue_offline`). `TauriSync` replays via `fetch` (tauri http plugin bypasses CORS) even if IDB cleared. DB at `%APPDATA%/com.mineazy.pos/mineazy_pos.db`.
3. **POS**: Offline sale → `saveOfflineTransaction` + `tauriEnqueue` → simulated `OFF-*` receipt (`pos/page.tsx:764`); on reconnect both queues drained, stock/journal created server-side (`src/app/api/pos/transactions/route.ts:234`).

## Hardware Printing

- Web: `window.open` thermal 58mm (`pos-print.ts:139`).
- Desktop: `invoke('print_raw', {printerName, data})` (`main.rs:print_raw`) — Windows `notepad /p` fallback; replace with `tauri-plugin-printer` or `escpos` crate for USB raw 80mm + drawer kick. Frontend already routes through `tauri-bridge.ts:print_raw`.

## Build & Run

### Prereqs (Windows)
- Node 20+, Rust stable (`rustup default stable` done), **Visual Studio Build Tools 2022 with C++** (`link.exe` required — `cargo check` currently fails on this runner for that reason only), WebView2 (Win11 preinstalled).

```powershell
npm install
npx tsc --noEmit          # web check
npm run dev               # Next on :3000
# desktop dev (second shell)
npx tauri dev             # uses src-tauri/tauri.conf.json devUrl http://localhost:3000
# production
npm run build
npx tauri build           # -> src-tauri/target/release/bundle/msi/*.msi + .../bundle/nsis/*.exe
```

### CI (recommended)
Use `actions-rs` + `tauri-apps/tauri-action` on `windows-latest`:
```yaml
- uses: dtolnay/rust-toolchain@stable
- uses: tauri-apps/tauri-action@v0
  with: { args: --verbose }
```

### Branch Deployment
POS still talks to `https://mineazy.com/api/*` (`src/app/api/*`). For true island mode, run Next locally: `npm run build; npm start` on branch server and point `tauri.conf.json` `devUrl` to `http://branch-server:3001` or bundle static export (`next export` + `frontendDist: ../out`).

## Next Hardening (1-2 days)

- Pre-cache 5000 products on session open (`cacheData('products_cache')` already does) + warm on Tauri `setup`.
- Defer loyalty/fiscal checks when offline (already optimistic), add stock oversell guard (local `branchStocks` decrement).
- Sign MSI with `tauri signer` + updater (`bundle.createUpdaterArtifacts:true`).

## Verification on this host

- `npx tsc --noEmit` — pass
- `npx @tauri-apps/cli --version` — 2.11.4
- `rustc 1.98.0 / cargo 1.98.0` — installed
- `cargo check` — fails only on `link.exe not found` (expected without VS Build Tools), no Rust syntax errors
- Icons copied from `public/logo.png`

Run `npx tauri dev` after installing VS Build Tools to see live POS with `TauriSync` pending badge.
