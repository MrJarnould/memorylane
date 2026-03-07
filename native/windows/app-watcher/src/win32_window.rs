use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::path::Path;
use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE, HWND, RECT};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowRect, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
};

use crate::types::WindowBoundsPayload;

pub fn hwnd_is_valid(hwnd: HWND) -> bool {
    !hwnd.0.is_null()
}

pub fn read_window_title(hwnd: HWND) -> String {
    let title_len = unsafe { GetWindowTextLengthW(hwnd) };
    if title_len <= 0 {
        return String::new();
    }

    let mut utf16 = vec![0u16; title_len as usize + 1];
    let copied = unsafe { GetWindowTextW(hwnd, &mut utf16) };
    if copied <= 0 {
        return String::new();
    }

    OsString::from_wide(&utf16[..copied as usize])
        .to_string_lossy()
        .to_string()
}

pub fn read_window_pid(hwnd: HWND) -> u32 {
    let mut pid = 0u32;
    unsafe {
        let _ = GetWindowThreadProcessId(hwnd, Some(&mut pid));
    }
    pid
}

fn close_handle(handle: HANDLE) {
    if !handle.is_invalid() {
        unsafe {
            let _ = CloseHandle(handle);
        }
    }
}

pub fn read_process_name(pid: u32) -> String {
    if pid == 0 {
        return String::new();
    }

    let process_handle = unsafe {
        OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).unwrap_or(HANDLE::default())
    };
    if process_handle.is_invalid() {
        return String::new();
    }

    let mut buffer = vec![0u16; 4096];
    let mut size = buffer.len() as u32;
    let mut process_name = String::new();

    let ok = unsafe {
        QueryFullProcessImageNameW(
            process_handle,
            PROCESS_NAME_WIN32,
            PWSTR(buffer.as_mut_ptr()),
            &mut size,
        )
    };
    if ok.is_ok() && size > 0 {
        let process_path = OsString::from_wide(&buffer[..size as usize])
            .to_string_lossy()
            .to_string();
        process_name = Path::new(&process_path)
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("")
            .to_string();
    }

    close_handle(process_handle);
    process_name
}

pub fn read_window_bounds(hwnd: HWND) -> Option<WindowBoundsPayload> {
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
        return None;
    }

    let width = rect.right.saturating_sub(rect.left);
    let height = rect.bottom.saturating_sub(rect.top);
    if width <= 0 || height <= 0 {
        return None;
    }

    Some(WindowBoundsPayload {
        x: rect.left,
        y: rect.top,
        width,
        height,
    })
}
