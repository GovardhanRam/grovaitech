/**
 * Grovaitech AI Platform
 * app/api/mock-auth/logout/route.ts
 *
 * Mock logout endpoint. Deletes the session cookie.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('grovaitech_session');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
