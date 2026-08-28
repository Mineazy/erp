// Mineazy POS Desktop - Tauri 2 main
// Offline-first wrapper: SQLite queue + ESC/POS printer bridge
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, State};
use rusqlite::{params, Connection};
use std::sync::Mutex;

struct DbState(Mutex<Connection>);

#[derive(Serialize, Deserialize, Debug)]
struct QueuedTx {
    id: String,
    r#type: String,
    url: String,
    method: String,
    payload: String,
    idempotency_key: String,
    timestamp: i64,
    status: String,
}

fn db_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("app_data_dir");
    std::fs::create_dir_all(&dir).unwrap();
    dir.join("mineazy_pos.db")
}

fn init_db(conn: &Connection) {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS offline_queue (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            url TEXT NOT NULL,
            method TEXT NOT NULL,
            payload TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            error TEXT
        );
        CREATE TABLE IF NOT EXISTS products_cache (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_cache (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_queue_status ON offline_queue(status);
        "#,
    ).unwrap();
}

#[tauri::command]
fn enqueue_offline(state: State<DbState>, tx: QueuedTx) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO offline_queue (id, type, url, method, payload, idempotency_key, timestamp, status) VALUES (?1,?2,?3,?4,?5,?6,?7,'pending')",
        params![tx.id, tx.r#type, tx.url, tx.method, tx.payload, tx.idempotency_key, tx.timestamp],
    ).map_err(|e| e.to_string())?;
    Ok(tx.id)
}

#[tauri::command]
fn get_pending(state: State<DbState>) -> Result<Vec<QueuedTx>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, type, url, method, payload, idempotency_key, timestamp, status FROM offline_queue WHERE status='pending' ORDER BY timestamp ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(QueuedTx {
            id: row.get(0)?,
            r#type: row.get(1)?,
            url: row.get(2)?,
            method: row.get(3)?,
            payload: row.get(4)?,
            idempotency_key: row.get(5)?,
            timestamp: row.get(6)?,
            status: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn mark_synced(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM offline_queue WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn mark_failed(state: State<DbState>, id: String, error: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE offline_queue SET status='failed', error=?2 WHERE id=?1", params![id, error]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn pending_count(state: State<DbState>) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let c: i64 = conn.query_row("SELECT COUNT(*) FROM offline_queue WHERE status='pending'", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(c)
}

// ESC/POS raw print - expects already-formatted bytes as base64 or plain text
#[tauri::command]
async fn print_raw(printer_name: String, data: String, is_base64: Option<bool>) -> Result<String, String> {
    // Desktop printers: use system default if name empty
    // For now delegate to shell open - real ESC/POS via printer plugin
    // This is a bridge: frontend sends already-rendered receipt text/PDF url
    // Tauri will use OS print dialog or raw USB.
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // Fallback: open PDF via shell if data is URL/path
        if data.starts_with("http") || data.ends_with(".pdf") {
            Command::new("cmd").args(["/C", "start", "", &data]).spawn().map_err(|e| e.to_string())?;
            return Ok("opened".into());
        }
        // Raw text to default printer via notepad / print
        let tmp = std::env::temp_dir().join("mineazy_receipt.txt");
        std::fs::write(&tmp, &data).map_err(|e| e.to_string())?;
        Command::new("notepad").arg("/p").arg(&tmp).spawn().map_err(|e| e.to_string())?;
        return Ok(format!("printed to {}", printer_name));
    }
    #[cfg(not(target_os = "windows"))]
    {
        return Ok(format!("print_raw stub: {} bytes to {}", data.len(), printer_name));
    }
}

#[tauri::command]
fn get_app_version() -> String { env!("CARGO_PKG_VERSION").to_string() }

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            let path = db_path(app.handle());
            let conn = Connection::open(&path).expect("open sqlite");
            init_db(&conn);
            app.manage(DbState(Mutex::new(conn)));
            // Open devtools in debug
            #[cfg(debug_assertions)]
            {
                if let Some(win) = app.get_webview_window("main") {
                    win.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            enqueue_offline,
            get_pending,
            mark_synced,
            mark_failed,
            pending_count,
            print_raw,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
