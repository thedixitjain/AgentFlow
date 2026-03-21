import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import gifenc from 'gifenc'

const { GIFEncoder, quantize, applyPalette } = gifenc

const mediaDir = path.resolve('docs', 'media')
const frameNames = [
  'gif-01-landing.png',
  'gif-02-chat.png',
  'gif-03-insights.png',
]
const outputPath = path.join(mediaDir, 'demo.gif')
const targetWidth = 1280
const frameDelays = [1400, 1700, 1800]

const frames = frameNames.map((name) => {
  const filePath = path.join(mediaDir, name)
  const png = PNG.sync.read(fs.readFileSync(filePath))
  return {
    name,
    width: png.width,
    height: png.height,
    rgba: png.data,
  }
})

const [firstFrame] = frames
if (!firstFrame) {
  throw new Error('No GIF frames found.')
}

for (const frame of frames) {
  if (frame.width !== firstFrame.width || frame.height !== firstFrame.height) {
    throw new Error(`Frame size mismatch for ${frame.name}.`)
  }
}

const targetHeight = Math.round((firstFrame.height / firstFrame.width) * targetWidth)
const resizedFrames = frames.map((frame) => ({
  ...frame,
  width: targetWidth,
  height: targetHeight,
  rgba: resizeRgba(frame.rgba, firstFrame.width, firstFrame.height, targetWidth, targetHeight),
}))

const rgba = new Uint8Array(resizedFrames.reduce((total, frame) => total + frame.rgba.length, 0))
let offset = 0
for (const frame of resizedFrames) {
  rgba.set(frame.rgba, offset)
  offset += frame.rgba.length
}

const palette = quantize(rgba, 256, { format: 'rgba4444' })
const gif = GIFEncoder()

for (const [index, frame] of resizedFrames.entries()) {
  const indexed = applyPalette(frame.rgba, palette, { format: 'rgba4444' })
  gif.writeFrame(indexed, frame.width, frame.height, {
    palette,
    delay: frameDelays[index] ?? 1600,
    repeat: index === 0 ? 0 : undefined,
  })
}

gif.finish()
fs.writeFileSync(outputPath, gif.bytesView())
console.log(`Wrote ${outputPath}`)

function resizeRgba(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const output = new Uint8Array(targetWidth * targetHeight * 4)

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.round((y / targetHeight) * sourceHeight))
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.round((x / targetWidth) * sourceWidth))
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4
      const targetOffset = (y * targetWidth + x) * 4

      output[targetOffset] = source[sourceOffset]
      output[targetOffset + 1] = source[sourceOffset + 1]
      output[targetOffset + 2] = source[sourceOffset + 2]
      output[targetOffset + 3] = source[sourceOffset + 3]
    }
  }

  return output
}
