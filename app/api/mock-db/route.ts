/**
 * Grovaitech AI Platform
 * app/api/mock-db/route.ts
 *
 * Mock database API endpoints.
 * Handles client-side query delegation when Supabase credentials are not present.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockDb, saveMockDb } from '@/lib/supabase/mockDbHelper';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const filterField = searchParams.get('filterField');
  const filterVal = searchParams.get('filterVal');
  const orderField = searchParams.get('orderField');
  const orderAsc = searchParams.get('orderAsc') === 'true';
  const limit = searchParams.get('limit');
  const single = searchParams.get('single') === 'true';

  if (!table) {
    return NextResponse.json({ error: 'Table is required' }, { status: 400 });
  }

  try {
    const db = getMockDb();
    const records = (db as any)[table] || [];

    let result = [...records];
    if (filterField && filterVal !== null && filterVal !== undefined) {
      result = result.filter((r) => String(r[filterField]) === String(filterVal));
    }

    if (orderField) {
      result.sort((a, b) => {
        const valA = a[orderField];
        const valB = b[orderField];
        if (valA < valB) return orderAsc ? -1 : 1;
        if (valA > valB) return orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (limit) {
      result = result.slice(0, parseInt(limit));
    }

    if (single) {
      return NextResponse.json({ data: result[0] || null });
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, table, data, filterField, filterVal } = await request.json();

    if (!table) {
      return NextResponse.json({ error: 'Table is required' }, { status: 400 });
    }

    const db = getMockDb();
    const records = (db as any)[table] || [];

    if (action === 'insert') {
      const newRecords = Array.isArray(data) ? data : [data];
      const inserted = newRecords.map((r: any) => ({
        id: r.id || `mock-${table}-${Math.random().toString(36).substring(2, 9)}`,
        created_at: r.created_at || new Date().toISOString(),
        ...r
      }));
      records.push(...inserted);
      (db as any)[table] = records;
      saveMockDb(db);
      return NextResponse.json({ data: Array.isArray(data) ? inserted : inserted[0] });
    }

    if (action === 'update') {
      let updated: any[] = [];
      const updatedRecords = records.map((r: any) => {
        if (filterField && String(r[filterField]) === String(filterVal)) {
          const up = { ...r, ...data };
          updated.push(up);
          return up;
        }
        return r;
      });
      (db as any)[table] = updatedRecords;
      saveMockDb(db);
      return NextResponse.json({ data: updated });
    }

    if (action === 'delete') {
      const remaining = records.filter((r: any) => !filterField || String(r[filterField]) !== String(filterVal));
      const deleted = records.filter((r: any) => filterField && String(r[filterField]) === String(filterVal));
      (db as any)[table] = remaining;
      saveMockDb(db);
      return NextResponse.json({ data: deleted });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
