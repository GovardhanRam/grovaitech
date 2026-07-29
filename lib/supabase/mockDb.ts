/**
 * Grovaitech AI Platform
 * lib/supabase/mockDb.ts
 *
 * Mock client fallback when Supabase keys are not present in .env.local.
 * Intercepts auth and database calls and forwards them to local mock APIs.
 * Fully supports chaining like .insert().select().single()
 */

// Helper to get and set cookies in the browser
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, val: string, days = 7) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; expires=${date.toUTCString()}`;
  document.cookie = `${name}=${val || ""}${expires}; path=/`;
}

function eraseCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}

export function createMockClient() {
  const auth = {
    signUp: async ({ email, password, options }: any) => {
      try {
        const res = await fetch('/api/mock-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName: options?.data?.full_name || '' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        
        // Set local session cookie
        setCookie('grovaitech_session', JSON.stringify(data.user));
        return { data: { user: data.user, session: { access_token: 'mock-token' } }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },
    
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const res = await fetch('/api/mock-auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        // Set local session cookie
        setCookie('grovaitech_session', JSON.stringify(data.user));
        return { data: { user: data.user, session: { access_token: 'mock-token' } }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },
    
    signOut: async () => {
      eraseCookie('grovaitech_session');
      try {
        await fetch('/api/mock-auth/logout', { method: 'POST' });
      } catch (e) {}
      return { error: null };
    },
    
    getUser: async () => {
      try {
        // Read cookie or fetch from session endpoint
        const sessionCookie = getCookie('grovaitech_session');
        if (sessionCookie) {
          return { data: { user: JSON.parse(sessionCookie) }, error: null };
        }
        
        const res = await fetch('/api/mock-auth/me');
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        return { data: { user: data.user }, error: null };
      } catch (err) {
        return { data: { user: null }, error: err as any };
      }
    },

    getSession: async () => {
      const sessionCookie = getCookie('grovaitech_session');
      if (sessionCookie) {
        const user = JSON.parse(sessionCookie);
        return { data: { session: { user, access_token: 'mock-token' } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
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

    const execute = async () => {
      if (queryAction === 'insert') {
        const res = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table, data: payloadData }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return { data: result.data, error: null };
      }

      if (queryAction === 'update') {
        const res = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table, data: payloadData, filterField, filterVal }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return { data: result.data, error: null };
      }

      if (queryAction === 'delete') {
        const res = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', table, filterField, filterVal }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return { data: result.data, error: null };
      }

      // Default select
      let url = `/api/mock-db?table=${table}`;
      if (filterField) url += `&filterField=${filterField}&filterVal=${encodeURIComponent(filterVal)}`;
      if (orderField) url += `&orderField=${orderField}&orderAsc=${orderAsc}`;
      if (limitCount) url += `&limit=${limitCount}`;
      
      const res = await fetch(url);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return { data: result.data, error: null };
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
      then: async (onfulfilled: any) => {
        try {
          const res = await execute();
          return onfulfilled(res);
        } catch (err: any) {
          return onfulfilled({ data: null, error: err });
        }
      },
      single: async () => {
        try {
          if (queryAction === 'select') {
            let url = `/api/mock-db?table=${table}&single=true`;
            if (filterField) url += `&filterField=${filterField}&filterVal=${encodeURIComponent(filterVal)}`;
            const res = await fetch(url);
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            return { data: result.data, error: null };
          } else {
            const res = await execute();
            const item = Array.isArray(res.data) ? res.data[0] : res.data;
            return { data: item || null, error: item ? null : new Error('Not found') };
          }
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };

    return builder;
  };

  return { auth, from };
}
