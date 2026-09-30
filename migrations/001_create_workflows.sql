-- ==============================================================================
-- ZipStream Workflows — Supabase Database Migration (Zero-Auth / Anonymous Friendly)
-- ==============================================================================
-- You can run this directly in the Supabase Dashboard -> SQL Editor.
-- NO user signup or login is required; anonymous browser visitors are fully supported!

-- 1. Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows (user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows (created_at DESC);

-- 2. Workflow Steps Table (ordered 1 to 4)
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order SMALLINT NOT NULL CHECK (step_order >= 1 AND step_order <= 4),
  tool_key VARCHAR(64) NOT NULL,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_workflow_step_order UNIQUE (workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps (workflow_id);

-- 3. Workflow Execution Runs Table
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_count SMALLINT DEFAULT 1,
  output_filename VARCHAR(255),
  error_step SMALLINT,
  error_message_safe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs (created_at DESC);

-- 4. Enable Row Level Security (RLS) with Public Anonymous Access
-- This ensures Supabase allows queries using the Anon key or Service key without requiring user login
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public anonymous access for workflows" ON workflows;
DROP POLICY IF EXISTS "Public anonymous access for workflow_steps" ON workflow_steps;
DROP POLICY IF EXISTS "Public anonymous access for workflow_runs" ON workflow_runs;

-- Allow anonymous visitors with their session token to access workflows
CREATE POLICY "Public anonymous access for workflows"
  ON workflows FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public anonymous access for workflow_steps"
  ON workflow_steps FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public anonymous access for workflow_runs"
  ON workflow_runs FOR ALL
  USING (true)
  WITH CHECK (true);
