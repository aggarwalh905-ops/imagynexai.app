import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { username, password, pollenToken } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Username pattern check
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // 2. Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    // 3. Hash Password & Generate Recovery Key
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const recoveryKey = crypto.randomBytes(8).toString('hex'); // 16-char secret key
    const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    // 4. Create User Record in Supabase
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        username: cleanUsername,
        display_name: username.trim(),
        password_hash: passwordHash,
        recovery_key: recoveryKey,
        pollen_token: pollenToken || null,
        total_creations: 0,
        total_likes: 0,
        monthly_likes: 0,
        liked_images: [],
        last_active: new Date().toISOString()
      })
      .select('id, username, display_name, recovery_key, pollen_token')
      .single();

    if (createError) throw createError;

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: 'Account created successfully. Save your recovery key!'
    });

  } catch (err: unknown) {
    console.error('Register API Error:', err);
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}