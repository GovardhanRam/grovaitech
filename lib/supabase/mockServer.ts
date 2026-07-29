/**
 * Grovaitech AI Platform
 * lib/supabase/mockServer.ts
 *
 * Server-side mock client fallback. Reads/writes mock-db.json directly.
 * Fully supports chaining like .insert().select().single()
 */

import { cookies } from 'next/headers';
import { getMockDb, saveMockDb } from './mockDbHelper';

export function createMockServerClient() {
  const auth = {
    getUser: async () => {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('grovaitech_session')?.value;
        if (sessionCookie) {
          return { data: { user: JSON.parse(sessionCookie) }, error: null };
        }
      } catch (e) {}
      return { data: { user: null }, error: new Error('Unauthorized') };
    },
    getSession: async () => {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('grovaitech_session')?.value;
        if (sessionCookie) {
          const user = JSON.parse(sessionCookie);
          return { data: { session: { user, access_token: 'mock-token' } }, error: null };
        }
      } catch (e) {}
      return { data: { session: null }, error: null };
    }
  };

  const from = (table: string) => {
    let filterField: string | null = null;
    let filterVal: any = null;
    let orderField: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;
    let queryAction: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payloadData: any = null;

    const execute = () => {
      const db = getMockDb();
      const records = (db as any)[table] || [];

      if (queryAction === 'insert') {
        const newRecords = Array.isArray(payloadData) ? payloadData : [payloadData];
        const inserted = newRecords.map((r: any) => ({
          id: r.id || `mock-${table}-${Math.random().toString(36).substring(2, 9)}`,
          created_at: r.created_at || new Date().toISOString(),
          ...r
        }));
        records.push(...inserted);
        (db as any)[table] = records;
        saveMockDb(db);
        return { data: Array.isArray(payloadData) ? inserted : inserted[0], error: null };
      }

      if (queryAction === 'update') {
        let updated: any[] = [];
        const updatedRecords = records.map((r: any) => {
          if (filterField && String(r[filterField]) === String(filterVal)) {
            const up = { ...r, ...payloadData };
            updated.push(up);
            return up;
          }
          return r;
        });
        (db as any)[table] = updatedRecords;
        saveMockDb(db);
        return { data: updated, error: null };
      }

      if (queryAction === 'delete') {
        const remaining = records.filter((r: any) => !filterField || String(r[filterField]) !== String(filterVal));
        const deleted = records.filter((r: any) => filterField && String(r[filterField]) === String(filterVal));
        (db as any)[table] = remaining;
        saveMockDb(db);
        return { data: deleted, error: null };
      }

      // Default: select
      let filtered = [...records];
      if (filterField) {
        filtered = filtered.filter((r: any) => String(r[filterField!]) === String(filterVal));
      }
      
      if (orderField) {
        filtered.sort((a: any, b: any) => {
          const valA = a[orderField!];
          const valB = b[orderField!];
          if (valA < valB) return orderAsc ? -1 : 1;
          if (valA > valB) return orderAsc ? 1 : -1;
          return 0;
        });
      }
      
      if (limitCount !== null) {
        filtered = filtered.slice(0, limitCount);
      }
      
      return { data: filtered, error: null };
    };

    const builder = {
      select: (fields = '*') => {
        return builder;
      },
      eq: (field: string, val: any) => {
        filterField = field;
        filterVal = val;
        return builder;
      },
      order: (field: string, options: any = {}) => {
        orderField = field;
        orderAsc = options.ascending ?? true;
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      insert: (data: any) => {
        queryAction = 'insert';
        payloadData = data;
        return builder;
      },
      update: (data: any) => {
        queryAction = 'update';
        payloadData = data;
        return builder;
      },
      delete: () => {
        queryAction = 'delete';
        return builder;
      },
      // Direct Promise interface support
      then: (onfulfilled: any) => {
        try {
          const res = execute();
          return onfulfilled(res);
        } catch (err: any) {
          return onfulfilled({ data: null, error: err });
        }
      },
      single: async () => {
        try {
          const res = execute();
          const item = Array.isArray(res.data) ? res.data[0] : res.data;
          return { data: item || null, error: item ? null : new Error('Not found') };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };

    return builder;
  };

  return { auth, from };
}
