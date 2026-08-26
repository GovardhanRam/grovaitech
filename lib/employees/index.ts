import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { createMockServerClient } from '@/lib/supabase/mockServer'

const getPublicClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder') || url === '') {
    return createMockServerClient() as any
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

export interface AIEmployee {
  id: string
  name: string
  slug: string
  title: string
  department: string
  industry: string
  description: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
  responsibilities: string[]
  integrations: string[]
  channels: string[]
  system_prompt: string
  pricing: {
    monthly: number
    setup: number
  }
  demo_config: {
    enabled: boolean
  }
  avatar_url: string | null
  version: string
  created_at: string
  updated_at: string
}

export async function getAllEmployees(): Promise<AIEmployee[]> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('ai_employees')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  const list = data || []
  return list.map((emp: any) => {
    if (emp.slug === 'real-estate-lead-receptionist') {
      return {
        ...emp,
        demo_config: { ...emp.demo_config, enabled: true }
      }
    }
    return emp
  })
}

export async function getEmployeeBySlug(
  slug: string
): Promise<AIEmployee | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('ai_employees')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching employee:', error)
    return null
  }

  if (data && data.slug === 'real-estate-lead-receptionist') {
    return {
      ...data,
      demo_config: { ...data.demo_config, enabled: true }
    }
  }

  return data
}

export async function getEmployeeById(
  id: string
): Promise<AIEmployee | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('ai_employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching employee:', error)
    return null
  }

  return data
}
