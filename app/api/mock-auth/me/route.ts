/**
 * Grovaitech AI Platform
 * app/api/mock-auth/me/route.ts
 *
 * Mock me endpoint. Retrieves current session user info.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('grovaitech_session')?.value;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ user: JSON.parse(session) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
