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
  /** Human-facing display name for cards and marketplace listings */
  displayName?: string;
  /** High-level summary of capabilities for previews */
  shortDescription?: string;
  /** Primary workforce category */
  category?: MarketplaceCategory;
  /** Searchable keywords and tags */
  keywords?: string[];
  /** Priority ordering for marketplace sorting */
  priority?: number;
  /** Integration IDs mandatory for this employee's primary workflows */
  requiredIntegrations?: string[];
  /** Optional integration IDs that enhance capabilities */
  optionalIntegrations?: string[];
  /** Template ID for associated workflow blueprints */
  workflowTemplateId?: string;
  /** Structured configuration schema for tenant onboarding */
  configurationSchema?: Record<string, unknown>;
  /** Execution delivery mode */
  deploymentMode?: DeploymentMode;
}

