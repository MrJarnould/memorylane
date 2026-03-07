use once_cell::sync::Lazy;
use std::sync::Mutex;

use crate::types::{LastWindowState, WindowSnapshot};

pub static LAST_WINDOW_STATE: Lazy<Mutex<LastWindowState>> =
    Lazy::new(|| Mutex::new(LastWindowState::default()));

pub fn should_emit_app_change(snapshot: &WindowSnapshot, state: &LastWindowState) -> bool {
    snapshot.hwnd != state.hwnd
        || snapshot.pid != state.pid
        || snapshot.app != state.app
        || snapshot.title != state.title
        || snapshot.url != state.url
}

pub fn should_emit_window_change(snapshot: &WindowSnapshot, state: &LastWindowState) -> bool {
    snapshot.hwnd == state.hwnd
        && snapshot.pid == state.pid
        && (snapshot.title != state.title || snapshot.url != state.url)
}

pub fn update_last_state(snapshot: &WindowSnapshot, state: &mut LastWindowState) {
    state.hwnd = snapshot.hwnd;
    state.pid = snapshot.pid;
    state.app = snapshot.app.clone();
    state.title = snapshot.title.clone();
    state.url = snapshot.url.clone();
}
