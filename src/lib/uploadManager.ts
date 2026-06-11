export type UploadResult = {
  cloudUrl: string
  cloudPages?: string[]
  cloudFrames?: string[]
  cloudReliefFrames?: string[]
}

export async function uploadCapture(params: {
  mode: string
  asset: Blob
  mediaType: 'image' | 'video'
  pages?: Blob[]
  frames?: Blob[]
  reliefFrames?: Blob[]
}): Promise<UploadResult> {
  const form = new FormData()
  form.append('mode', params.mode)
  form.append('asset', params.asset)
  form.append('mediaType', params.mediaType)
  params.pages?.forEach((b, i) => form.append(`pages[${i}]`, b))
  params.frames?.forEach((b, i) => form.append(`frames[${i}]`, b))
  params.reliefFrames?.forEach((b, i) => form.append(`reliefFrames[${i}]`, b))

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const json = await res.json() as { ok: boolean } & UploadResult
  return json
}
