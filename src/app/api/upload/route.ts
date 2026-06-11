import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const data = await req.formData()
  const mode = (data.get('mode') as string | null) ?? 'unknown'
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Simulate 2-second network upload delay
  await new Promise<void>(resolve => setTimeout(resolve, 2000))

  const base = `https://mock-cloud-bucket.com/${mode}-${id}`

  const result: {
    ok: boolean
    cloudUrl: string
    cloudPages?: string[]
    cloudFrames?: string[]
    cloudReliefFrames?: string[]
  } = {
    ok: true,
    cloudUrl: `${base}-asset.jpg`,
  }

  // Count and build mock page URLs
  const pages: string[] = []
  for (let i = 0; data.get(`pages[${i}]`) !== null; i++) {
    pages.push(`${base}-page-${i}.jpg`)
  }
  if (pages.length) result.cloudPages = pages

  // Count and build mock frame URLs (scan3d)
  const frames: string[] = []
  for (let i = 0; data.get(`frames[${i}]`) !== null; i++) {
    frames.push(`${base}-frame-${i}.jpg`)
  }
  if (frames.length) result.cloudFrames = frames

  // Count and build mock relief frame URLs (relief180)
  const reliefFrames: string[] = []
  for (let i = 0; data.get(`reliefFrames[${i}]`) !== null; i++) {
    reliefFrames.push(`${base}-relief-${i}.jpg`)
  }
  if (reliefFrames.length) result.cloudReliefFrames = reliefFrames

  return NextResponse.json(result)
}
