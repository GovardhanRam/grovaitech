/**
 * Grovaitech AI Platform
 * lib/voice/audio.ts
 *
 * Audio processing and conversion utilities for GOVA Voice UI v1.
 * Handles PCM 16-bit encoding/decoding, Base64 streaming serialization,
 * and audio resampling for Web Audio API.
 */

/**
 * Converts Float32Array (browser audio input normalized between -1.0 and 1.0)
 * to 16-bit linear PCM Int16Array.
 */
export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm16
}

/**
 * Converts 16-bit linear PCM Int16Array back to Float32Array
 * for browser AudioBuffer playback.
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) {
    const s = pcm16[i]
    float32[i] = s < 0 ? s / 0x8000 : s / 0x7fff
  }
  return float32
}

/**
 * Converts an ArrayBuffer to a Base64 string.
 * Compatible with browser and Node environments.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  if (typeof window === 'undefined') {
    return Buffer.from(buffer as ArrayBuffer).toString('base64')
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  const chunkSize = 8192

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }

  return window.btoa(binary)
}

/**
 * Converts a Base64 string back to an ArrayBuffer.
 * Compatible with browser and Node environments.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof window === 'undefined') {
    const buf = Buffer.from(base64, 'base64')
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

/**
 * Downsamples audio buffer from source sample rate to target sample rate.
 * Uses linear interpolation.
 */
export function resampleAudioBuffer(
  inputData: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) {
    return inputData
  }

  const ratio = sourceRate / targetRate
  const outputLength = Math.round(inputData.length / ratio)
  const result = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio
    const index = Math.floor(position)
    const fraction = position - index

    if (index + 1 < inputData.length) {
      result[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction
    } else {
      result[i] = inputData[index] || 0
    }
  }

  return result
}
