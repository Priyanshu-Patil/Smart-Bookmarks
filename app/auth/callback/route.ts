
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const error_description = searchParams.get('error_description')
  const error_code = searchParams.get('error_code')

  // For OAuth, we might get 'code' instead of 'token_hash'
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    // Log error for debugging
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=auth&message=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error('OTP verification error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=auth&message=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // Handle OAuth errors passed as query params
  if (error_code || error_description) {
    console.error('OAuth error:', { error_code, error_description })
    return NextResponse.redirect(
      new URL(
        `/login?error=auth&code=${error_code || 'unknown'}&message=${encodeURIComponent(error_description || 'Authentication failed')}`,
        request.url
      )
    )
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=auth', request.url))
}
