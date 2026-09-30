/**
 * Frontend Workflow API Client
 *
 * Handles session tokens, CRUD operations, template cloning, and file pipeline execution.
 */

export interface WorkflowItem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps: Array<{
    id: string;
    step_order: number;
    tool_key: string;
    configuration: Record<string, any>;
  }>;
}

export interface WorkflowTemplateItem {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    tool_key: string;
    configuration: Record<string, any>;
  }>;
}

export interface RunWorkflowResponse {
  success: boolean;
  runId: string;
  outputFileName: string;
  downloadToken: string;
  downloadUrl: string;
  durationMs: number;
  stepsCompleted: number;
}

class WorkflowApiClient {
  private sessionToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('zipstream_workflow_session');
    }
  }

  public async getSessionToken(): Promise<string> {
    if (this.sessionToken) return this.sessionToken;

    try {
      const res = await fetch('/api/workflows/session');
      const data = await res.json();
      if (data.token) {
        this.sessionToken = data.token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('zipstream_workflow_session', data.token);
        }
        return data.token;
      }
    } catch (err) {
      console.warn('Failed to obtain session token from backend:', err);
    }

    return 'guest_token';
  }

  private async authHeaders(): Promise<HeadersInit> {
    const token = await this.getSessionToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-zipstream-session': token,
    };
  }

  public async listWorkflows(): Promise<WorkflowItem[]> {
    const headers = await this.authHeaders();
    const res = await fetch('/api/workflows', { headers });
    if (!res.ok) throw new Error('Failed to load workflows.');
    const data = await res.json();
    return data.workflows || [];
  }

  public async getTemplates(): Promise<WorkflowTemplateItem[]> {
    const res = await fetch('/api/workflows/templates');
    if (!res.ok) throw new Error('Failed to load templates.');
    const data = await res.json();
    return data.templates || [];
  }

  public async createWorkflow(
    name: string,
    description: string,
    steps: Array<{ tool_key: string; configuration: Record<string, any> }>
  ): Promise<WorkflowItem> {
    const headers = await this.authHeaders();
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description, steps }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to create workflow.');
    }
    return data.workflow;
  }

  public async updateWorkflow(
    id: string,
    name: string,
    description: string,
    steps: Array<{ tool_key: string; configuration: Record<string, any> }>
  ): Promise<WorkflowItem> {
    const headers = await this.authHeaders();
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name, description, steps }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to update workflow.');
    }
    return data.workflow;
  }

  public async deleteWorkflow(id: string): Promise<void> {
    const headers = await this.authHeaders();
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Failed to delete workflow.');
    }
  }

  public async duplicateWorkflow(id: string): Promise<WorkflowItem> {
    const headers = await this.authHeaders();
    const res = await fetch(`/api/workflows/${id}/duplicate`, {
      method: 'POST',
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to duplicate workflow.');
    }
    return data.workflow;
  }

  public async runWorkflow(
    id: string,
    files: File[]
  ): Promise<RunWorkflowResponse> {
    const token = await this.getSessionToken();
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`/api/workflows/${id}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-zipstream-session': token,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Workflow execution failed.');
    }
    return data;
  }
}

export const workflowApi = new WorkflowApiClient();
