-- 1. Custom Types
-- Note on case_priority: PostgreSQL enums sort by declaration sequence in CREATE TYPE.
-- 'low' is smallest, 'urgent' is greatest, so ORDER BY priority DESC yields urgent -> high -> medium -> low.
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE case_status AS ENUM ('open', 'assigned', 'resolved');
CREATE TYPE workspace_member_role AS ENUM ('agent', 'manager');

-- 2. Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    case_counter BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Workspace Members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role workspace_member_role NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, workspace_id)
);

-- 4. Cases table
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority case_priority NOT NULL,
    status case_status NOT NULL DEFAULT 'open',
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cases_workspace_reference UNIQUE (workspace_id, reference)
);

-- 5. Case Events table (append-only history)
CREATE TABLE IF NOT EXISTS public.case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recommended indexes for cursor pagination and sorting
CREATE INDEX IF NOT EXISTS idx_cases_pagination ON public.cases (workspace_id, priority, created_at, id);
CREATE INDEX IF NOT EXISTS idx_case_events_case_timeline ON public.case_events (case_id, created_at ASC);

-- 6. Security Grants & Role Revocations per ADR-0001
REVOKE ALL ON public.cases, public.case_events, public.workspaces, public.workspace_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cases, public.case_events, public.workspaces, public.workspace_members FROM authenticated;
GRANT SELECT ON public.cases, public.case_events, public.workspaces, public.workspace_members TO authenticated;

-- 7. Row-Level Security (RLS) Policies for authenticated role
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select_policy" ON public.workspaces
    FOR SELECT TO authenticated
    USING (id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "cases_select_policy" ON public.cases
    FOR SELECT TO authenticated
    USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "case_events_select_policy" ON public.case_events
    FOR SELECT TO authenticated
    USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

-- 8. Custom Access Token Hook Function (Postgres function)
-- Adds workspace_id, role, and display_name as custom claims into auth.jwt()
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_workspace_id uuid;
    user_role text;
    user_display_name text;
BEGIN
    -- Extract claims from incoming event
    claims := event->'claims';

    -- Look up workspace membership for the user
    SELECT workspace_id, role::text, display_name
    INTO user_workspace_id, user_role, user_display_name
    FROM public.workspace_members
    WHERE user_id = (event->>'user_id')::uuid
    LIMIT 1;

    -- If user belongs to a workspace, inject custom claims
    IF user_workspace_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{workspace_id}', to_jsonb(user_workspace_id::text));
        claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
        claims := jsonb_set(claims, '{display_name}', to_jsonb(user_display_name));
    END IF;

    -- Return modified event object
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- Secure Auth Hook permissions: only supabase_auth_admin can execute
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
