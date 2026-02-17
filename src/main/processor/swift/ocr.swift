import Cocoa
import Vision

// Parse arguments: ocr.swift <imagePath> [--mode fast|accurate]
guard CommandLine.arguments.count > 1 else {
    print("Error: No image path provided.")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let fileURL = URL(fileURLWithPath: imagePath)

var recognitionMode: VNRequestTextRecognitionLevel = .fast
if let modeIdx = CommandLine.arguments.firstIndex(of: "--mode"),
   modeIdx + 1 < CommandLine.arguments.count {
    let modeArg = CommandLine.arguments[modeIdx + 1].lowercased()
    if modeArg == "accurate" {
        recognitionMode = .accurate
    }
}

guard FileManager.default.fileExists(atPath: imagePath) else {
    print("Error: File not found at \(imagePath)")
    exit(1)
}

let request = VNRecognizeTextRequest { (request, error) in
    if let error = error {
        print("Error recognizing text: \(error.localizedDescription)")
        exit(1)
    }

    guard let observations = request.results as? [VNRecognizedTextObservation] else {
        return
    }

    let recognizedText = observations.compactMap { observation in
        return observation.topCandidates(1).first?.string
    }.joined(separator: "\n")

    print(recognizedText)
}

request.recognitionLevel = recognitionMode

let handler = VNImageRequestHandler(url: fileURL, options: [:])

do {
    try handler.perform([request])
} catch {
    print("Error processing image: \(error.localizedDescription)")
    exit(1)
}
