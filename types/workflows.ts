export type WorkflowStatus = 'active' | 'paused' | 'in_development' | 'draft'

export type StepType = 
  | 'ai_action' 
  | 'whatsapp' 
  | 'email' 
  | 'calendar' 
  | 'crm_sync' 
  | 'n8n_webhook' 
  | 'slack' 
  | 'database'

export interface WorkflowStep {
  id: string
  name: string
  type: StepType
  target: string
  description?: string
  config?: Record<string, any>
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  trigger_event: string
  status: 'success' | 'failed' | 'running'
  started_at: string
  duration_ms: number
  lead_name?: string
  error_message?: string
  payload_summary: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  trigger_event: string
  trigger_source: string
  assigned_employee: string
  assigned_employee_slug: string
  steps: WorkflowStep[]
  n8n_webhook_url?: string
  total_executions: number
  success_rate: number
  last_executed_at: string
  created_at: string
  executions: WorkflowExecution[]
}
