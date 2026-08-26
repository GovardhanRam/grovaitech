export type IntegrationCategory =
  | 'communication'
  | 'automation'
  | 'ai'
  | 'data'
  | 'calendar'
  | 'crm'

export type IntegrationStatus =
  | 'connected'
  | 'configured'
  | 'needs_setup'
  | 'demo'
  | 'not_connected'

export interface IntegrationField {
  id: string
  label: string
  type: 'text' | 'password' | 'select' | 'url'
  placeholder?: string
  value?: string
  masked?: boolean
  options?: string[]
  helpText?: string
}

export interface Integration {
  id: string
  name: string
  slug: string
  category: IntegrationCategory
  description: string
  status: IntegrationStatus
  iconType: string
  version?: string
  lastChecked?: string
  latencyMs?: number
  fields: IntegrationField[]
  relatedWorkflows: string[]
  docsUrl?: string
}
