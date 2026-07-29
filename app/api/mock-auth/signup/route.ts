/**
 * Grovaitech AI Platform
 * app/api/mock-auth/signup/route.ts
 *
 * Mock user registration. Appends new user to mock database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockDb, saveMockDb } from '@/lib/supabase/mockDbHelper';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getMockDb();
    const existing = db.users.find((u) => u.email === email);

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const newUser = {
      id: `mock-user-${Math.random().toString(36).substring(2, 9)}`,
      email,
      password,
      full_name: fullName || email.split('@')[0],
      role: 'User', // default new user role
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    saveMockDb(db);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('grovaitech_session', JSON.stringify({
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role
    }), { path: '/' });

    return NextResponse.json({ 
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        full_name: newUser.full_name, 
        role: newUser.role 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
