/**
 * Binary STL volume parser.
 *
 * STL units are mm; returned volume is cm³.
 * Returns null on malformed/empty buffers; never throws.
 */
export function parseStlVolume(buffer: Buffer): number | null {
  if (buffer.length < 84) return null

  const triangleCount = buffer.readUInt32LE(80)
  const expectedSize = 84 + 50 * triangleCount

  if (buffer.length !== expectedSize) {
    // Likely ASCII STL, or corrupt. ASCII parsing is intentionally not
    // implemented — modern slicers emit binary STL.
    return null
  }

  let volume = 0
  let offset = 84

  for (let i = 0; i < triangleCount; i++) {
    offset += 12 // skip normal
    const v1x = buffer.readFloatLE(offset); offset += 4
    const v1y = buffer.readFloatLE(offset); offset += 4
    const v1z = buffer.readFloatLE(offset); offset += 4
    const v2x = buffer.readFloatLE(offset); offset += 4
    const v2y = buffer.readFloatLE(offset); offset += 4
    const v2z = buffer.readFloatLE(offset); offset += 4
    const v3x = buffer.readFloatLE(offset); offset += 4
    const v3y = buffer.readFloatLE(offset); offset += 4
    const v3z = buffer.readFloatLE(offset); offset += 4
    offset += 2 // skip attr

    const crossX = v2y * v3z - v2z * v3y
    const crossY = v2z * v3x - v2x * v3z
    const crossZ = v2x * v3y - v2y * v3x
    volume += (v1x * crossX + v1y * crossY + v1z * crossZ) / 6
  }

  // mm³ → cm³
  return Math.abs(volume) / 1000
}
