import imageCompression from 'browser-image-compression'

export type UploadResult = {
  cloudUrl: string
  sizeBytes: number
  cloudPages?: string[]
  cloudFrames?: string[]
  cloudReliefFrames?: string[]
}

const compressionOptions = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  exifOrientation: true,
}

// Video assets can't be run through an image compressor — only still-image
// blobs (the main asset when mediaType is 'image', plus pages/frames/relief
// frames, which are always images regardless of mediaType) are compressed.
async function compressImage(blob: Blob): Promise<Blob> {
  try {
    return await imageCompression(blob as File, compressionOptions)
  } catch (error) {
    console.error('IMAGE COMPRESSION ERROR:', error)
    return blob
  }
}

export async function uploadCapture(params: {
  mode: string
  asset: Blob
  mediaType: 'image' | 'video'
  pages?: Blob[]
  frames?: Blob[]
  reliefFrames?: Blob[]
}): Promise<UploadResult> {
  const [compressedAsset, compressedPages, compressedFrames, compressedReliefFrames] = await Promise.all([
    params.mediaType === 'image' ? compressImage(params.asset) : params.asset,
    Promise.all((params.pages ?? []).map(compressImage)),
    Promise.all((params.frames ?? []).map(compressImage)),
    Promise.all((params.reliefFrames ?? []).map(compressImage)),
  ])

  const form = new FormData()
  form.append('mode', params.mode)
  form.append('asset', compressedAsset)
  form.append('mediaType', params.mediaType)
  compressedPages.forEach((b, i) => form.append(`pages[${i}]`, b))
  compressedFrames.forEach((b, i) => form.append(`frames[${i}]`, b))
  compressedReliefFrames.forEach((b, i) => form.append(`reliefFrames[${i}]`, b))

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const json = await res.json() as { ok: boolean } & UploadResult
  return json
}
