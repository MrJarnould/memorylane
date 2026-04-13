# MemoryLane v0.20.2

Fixes a startup crash on Windows caused by onnxruntime DLLs not being found.

## What's Changed

- Moved the onnxruntime DLL PATH fix into a dedicated side-effect module (`onnxruntime-path-fix.ts`) imported before all other modules, so it runs before the static import chain (`runtime → embedding → @huggingface/transformers`) triggers `require('onnxruntime-node')`

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.20.1...v0.20.2
