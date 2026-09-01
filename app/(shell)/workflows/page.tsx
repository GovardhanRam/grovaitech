import { WorkflowsWorkspace } from '@/components/workflows/WorkflowsWorkspace'
import { getWorkflows } from '@/app/actions/workflows'

export const metadata = {
  title: 'Workflows & Automations | Grovaitech',
  description: 'Design, orchestrate, and monitor autonomous business workflows and n8n pipelines.',
}

export default async function WorkflowsPage() {
  const result = await getWorkflows()

  return (
    <WorkflowsWorkspace
      initialWorkflows={result.workflows}
      isFallback={result.isFallback}
    />
  )
}
