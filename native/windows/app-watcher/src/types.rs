use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct WindowBoundsPayload {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone)]
pub struct WindowSnapshot {
    pub hwnd: usize,
    pub pid: u32,
    pub app: String,
    pub title: String,
    pub url: Option<String>,
    pub window_bounds: WindowBoundsPayload,
}

#[derive(Default)]
pub struct LastWindowState {
    pub hwnd: usize,
    pub pid: u32,
    pub app: String,
    pub title: String,
    pub url: Option<String>,
}
