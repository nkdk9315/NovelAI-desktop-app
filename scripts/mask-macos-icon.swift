// Usage: swift scripts/mask-macos-icon.swift <input 1024px png> <output png>
import AppKit
import QuartzCore

// Apple macOS icon grid: 1024 canvas, 824x824 body, continuous corner radius ~185.4
let args = CommandLine.arguments
let src = NSImage(contentsOfFile: args[1])!
var rect = NSRect(x: 0, y: 0, width: 1024, height: 1024)
let cg = src.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
let canvas = 1024, body: CGFloat = 824, origin: CGFloat = 100

// 1) Mask the artwork with a continuous-corner rounded rect
let layer = CALayer()
layer.frame = CGRect(x: 0, y: 0, width: body, height: body)
layer.contents = cg
layer.contentsGravity = .resizeAspectFill
layer.cornerRadius = 185.4
layer.cornerCurve = .continuous
layer.masksToBounds = true
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let bodyCtx = CGContext(data: nil, width: Int(body), height: Int(body), bitsPerComponent: 8, bytesPerRow: 0,
                        space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
layer.render(in: bodyCtx)
let masked = bodyCtx.makeImage()!

// 2) Place it on the canvas with a soft drop shadow
let ctx = CGContext(data: nil, width: canvas, height: canvas, bitsPerComponent: 8, bytesPerRow: 0,
                    space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 20, color: CGColor(gray: 0, alpha: 0.3))
ctx.draw(masked, in: CGRect(x: origin, y: origin, width: body, height: body))
let out = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! out.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
