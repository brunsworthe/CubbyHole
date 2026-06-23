import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Service-role client — bypasses RLS. Server-only; never exposed to the browser.
    // Untyped: access_codes/profiles.is_beta_unlocked/storage_limit_bytes aren't in the
    // generated Database type yet (access_codes_schema.sql hasn't been run against the DB).
    // Instantiated inside the handler so build-time static analysis never touches it.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { accessCode, userId } = await req.json()

    if (!accessCode || !userId) {
      return NextResponse.json({ ok: false, error: 'Missing accessCode or userId' }, { status: 400 })
    }

    const { data: codeRow, error: lookupError } = await supabaseAdmin
      .from('access_codes')
      .select('id, storage_granted_bytes, max_uses, times_used')
      .eq('code', accessCode)
      .single()

    if (lookupError || !codeRow) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired access code' }, { status: 400 })
    }

    if (codeRow.times_used >= codeRow.max_uses) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired access code' }, { status: 400 })
    }

    const { error: incrementError } = await supabaseAdmin
      .from('access_codes')
      .update({ times_used: codeRow.times_used + 1 })
      .eq('id', codeRow.id)

    if (incrementError) {
      throw incrementError
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_beta_unlocked: true,
        storage_limit_bytes: codeRow.storage_granted_bytes,
      })
      .eq('id', userId)

    if (profileError) {
      throw profileError
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error'
    console.error('[/api/verify-code]', message)
    return NextResponse.json({ ok: false, error: 'Something went wrong verifying your code' }, { status: 500 })
  }
}
