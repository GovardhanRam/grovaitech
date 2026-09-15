/**
 * Grovaitech AI Platform
 * lib/employees/types.ts
 *
 * Unified type definitions for AI Employees across the Workforce Platform.
 */

export type AIEmployeeStatus =
  | 'live'
  | 'beta'
  | 'demo'
  | 'in_development'
  | 'planned';

export interface AIEmployeePricing {
  monthly: number;
  setup: number;
}

export interface AIEmployeeDemoConfig {
  enabled: boolean;
}

export type MarketplaceCategory =
  | 'Marketing'
  | 'Sales'
  | 'Customer Support'
  | 'Operations'
  | 'Finance'
  | 'Healthcare';

export type DeploymentMode = 'native' | 'n8n' | 'hybrid' | 'sandbox';

export interface AIEmployee {
  id: string;
  name: string;
  slug: string;
  title: string;
  department: string;
  industry: string;
  description: string;
  status: AIEmployeeStatus;
  capabilities: string[];
  responsibilities: string[];
  integrations: string[];
  channels: string[];
  tools: string[];
  system_prompt?: string;
  pricing: AIEmployeePricing;
  demo_config: AIEmployeeDemoConfig;
  avatar_url: string | null;
  version: string;
  created_at: string;
  updated_at: string;

  // Marketplace & Recipe Metadata (Phase 3)
  displayName?: string;
  shortDescription?: string;
  category?: MarketplaceCategory | string;
  keywords?: string[];
  priority?: number;
  requiredIntegrations?: string[];
  optionalIntegrations?: string[];
  workflowTemplateId?: string;
  configurationSchema?: Record<string, any>;
  deploymentMode?: DeploymentMode;
}
