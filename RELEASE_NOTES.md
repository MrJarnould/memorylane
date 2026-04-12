# MemoryLane v0.20.1

Fixes a startup crash on Windows caused by missing onnxruntime DLLs.

## What's Changed

- Fixed Windows startup crash: onnxruntime DLL directory is now added to PATH before module load, so the Windows DLL loader can find `onnxruntime.dll` and `DirectML.dll` in the asar.unpacked path

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.20.0...v0.20.1
