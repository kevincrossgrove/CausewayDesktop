import AppKit
import QuartzCore
import Foundation

if CommandLine.arguments.count < 3 {
  fputs("usage: make-macos-icon <input.png> <output.png>\n", stderr)
  exit(1)
}

let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let canvas: CGFloat = 1024
// Apple's macOS icon grid: 824pt artwork on a 1024pt canvas (~100px margin).
let inner: CGFloat = 824
let origin = (canvas - inner) / 2

guard let source = NSImage(contentsOfFile: inputPath) else {
  fputs("Could not read \(inputPath)\n", stderr)
  exit(1)
}

let layer = CALayer()
layer.frame = CGRect(x: origin, y: origin, width: inner, height: inner)
layer.contents = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
layer.contentsGravity = .resize
layer.cornerRadius = inner * 0.223
layer.cornerCurve = .continuous
layer.masksToBounds = true

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
  data: nil,
  width: Int(canvas),
  height: Int(canvas),
  bitsPerComponent: 8,
  bytesPerRow: 0,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  fputs("Could not create graphics context\n", stderr)
  exit(1)
}

context.translateBy(x: 0, y: canvas)
context.scaleBy(x: 1, y: -1)
layer.render(in: context)

guard let cgImage = context.makeImage() else {
  fputs("Could not render icon\n", stderr)
  exit(1)
}

let rep = NSBitmapImageRep(cgImage: cgImage)
rep.size = NSSize(width: canvas, height: canvas)
guard let png = rep.representation(using: .png, properties: [:]) else {
  fputs("Could not encode PNG\n", stderr)
  exit(1)
}

do {
  try png.write(to: URL(fileURLWithPath: outputPath))
} catch {
  fputs("Could not write \(outputPath): \(error)\n", stderr)
  exit(1)
}
