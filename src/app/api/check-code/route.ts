import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Service-role client — bypasses RLS. Server-only; never exposed to the browser.
    // Instantiated inside the handler so build-time static analysis never touches it.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { accessCode } = await req.json()

    if (!accessCode) {
      return NextResponse.json({ isValid: false }, { status: 400 })
    }

    const { data: codeRow, error } = await supabaseAdmin
      .from('access_codes')
      .select('times_used, max_uses')
      .eq('code', accessCode)
      .single()

    if (error || !codeRow) {
      return NextResponse.json({ isValid: false })
    }

    const isValid = codeRow.times_used < codeRow.max_uses
    return NextResponse.json({ isValid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error checking code'
    console.error('[/api/check-code]', message)
    return NextResponse.json({ isValid: false }, { status: 500 })
  }
}
