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

export interface AIEmployee {
  id: string;
  name: string;
  slug: string;
  title: string;
  department: string | null;
  industry: string | null;
  description: string | null;
  status: AIEmployeeStatus;
  capabilities: string[];
  responsibilities: string[];
  integrations: string[];
  channels: string[];
  tools?: string[];
  system_prompt?: string;
  pricing?: AIEmployeePricing;
  demo_config?: AIEmployeeDemoConfig;
  avatar_url: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}
