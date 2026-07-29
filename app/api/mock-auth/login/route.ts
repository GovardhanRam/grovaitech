/**
 * Grovaitech AI Platform
 * app/api/mock-auth/login/route.ts
 *
 * Mock login validation. Sets session cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockDb } from '@/lib/supabase/mockDbHelper';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getMockDb();
    const user = db.users.find((u) => u.email === email && u.password === password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('grovaitech_session', JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'Admin'
    }), { path: '/' });

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        full_name: user.full_name, 
        role: user.role || 'Admin' 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
