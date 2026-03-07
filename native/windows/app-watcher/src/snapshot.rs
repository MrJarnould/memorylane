use windows::Win32::Foundation::HWND;

use crate::browser_url::read_browser_url;
use crate::types::WindowSnapshot;
use crate::win32_window::{
    hwnd_is_valid, read_process_name, read_window_bounds, read_window_pid, read_window_title,
};

pub fn snapshot_window(hwnd: HWND) -> Option<WindowSnapshot> {
    if !hwnd_is_valid(hwnd) {
        return None;
    }

    let pid = read_window_pid(hwnd);
    let title = read_window_title(hwnd);
    let app = read_process_name(pid);
    let url = read_browser_url(hwnd, &app);
    let bounds = read_window_bounds(hwnd)?;

    Some(WindowSnapshot {
        hwnd: hwnd.0 as usize,
        pid,
        app,
        title,
        url,
        window_bounds: bounds,
    })
}
