import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Fetch user by username
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, password_hash, pollen_token, recovery_key')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (fetchErr || !user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // 2. Validate Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Update last_active
    await supabaseAdmin
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        pollenToken: user.pollen_token,
        recoveryKey: user.recovery_key
      }
    });

  } catch (err: unknown) {
    console.error('Login API Error:', err);
    const msg = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}