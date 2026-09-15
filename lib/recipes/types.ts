/**
 * Grovaitech AI Platform
 * lib/recipes/types.ts
 *
 * Domain contracts for Employee Recipes, Workflow Specifications,
 * Blueprint Import Lifecycle, and Execution Provider Abstraction.
 *
 * Core Concept:
 * Employee ➔ Employee Recipe ➔ Workflow Specification ➔ Execution Adapter ➔ Provider (n8n / native)
 */

export type ExecutionProvider = 'native' | 'n8n'

/**
 * Workflow Blueprint Lifecycle States.
 * Crucial safety rule: A screenshot-derived or AI-generated workflow blueprint
 * must NEVER automatically be 'deployable' without validation.
 */
export type WorkflowBlueprintState =
  | 'draft'
  | 'review'
  | 'validated'
  | 'deployable'
  | 'deprecated'

export type WorkflowBlueprintSource =
  | 'n8n_json'
  | 'screenshot'
  | 'video_tutorial'
  | 'manual_definition'

export interface WorkflowBlueprint {
  id: string
  name: string
  version: string
  source: WorkflowBlueprintSource
  state: WorkflowBlueprintState
  rawContent?: any
  validatedAt?: string | null
  notes?: string
  metadata?: Record<string, any>
}

export type StageImplementationStatus = 'implemented' | 'planned' | 'requires_integration'

export interface WorkflowStage {
  id: string
  name: string
  description: string
  order: number
  requiredCapability: string
  inputs: string[]
  outputs: string[]
  isImplemented: boolean
  implementationStatus: StageImplementationStatus
  providerSupport: ExecutionProvider[]
  notes?: string
}

export interface WorkflowSpecification {
  id: string
  name: string
  description: string
  stages: WorkflowStage[]
  defaultProvider: ExecutionProvider
  blueprint?: WorkflowBlueprint
}

export interface ConfigurationField {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'select' | 'multiselect' | 'textarea'
  required: boolean
  options?: string[]
  defaultValue?: any
  description?: string
  placeholder?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface EmployeeConfigurationSchema {
  version: string
  fields: ConfigurationField[]
  validate: (config: Record<string, any>) => ValidationResult
}

export interface RecipeExecutionAdapter {
  provider: ExecutionProvider
  executeStage?: (stageId: string, input: any) => Promise<{
    stageId: string
    success: boolean
    result?: any
    error?: string
    isSimulated?: boolean
  }>
}

export interface EmployeeRecipe {
  id: string
  slug: string
  employeeId: string
  displayName: string
  category: string
  version: string
  description: string
  capabilities: string[]
  workflowSpec: WorkflowSpecification
  configurationSchema: EmployeeConfigurationSchema
  executionAdapter: RecipeExecutionAdapter
  createdAt: string
  updatedAt: string
}
