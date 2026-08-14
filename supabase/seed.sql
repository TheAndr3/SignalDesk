-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================================
-- 1. WORKSPACES
-- ============================================================================
INSERT INTO public.workspaces (id, name, case_counter, created_at, updated_at)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Acme Corp', 22, now() - interval '30 days', now()),
    ('b0000000-0000-0000-0000-000000000002', 'Stark Industries', 22, now() - interval '30 days', now())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    case_counter = EXCLUDED.case_counter;

-- ============================================================================
-- 2. AUTH USERS
-- Password for all seeded users: Password123!
-- ============================================================================
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES
    -- Workspace A Users
    (
        'a1111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'alice@acme.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "Alice Smith"}',
        now(),
        now()
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'bob@acme.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "Bob Jones"}',
        now(),
        now()
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'carol@acme.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "Carol Manager"}',
        now(),
        now()
    ),
    -- Workspace B Users
    (
        'b1111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'david@stark.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "David Miller"}',
        now(),
        now()
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'eva@stark.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "Eva Green"}',
        now(),
        now()
    ),
    (
        'b3333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'frank@stark.com',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"display_name": "Frank Director"}',
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password;

-- ============================================================================
-- 3. WORKSPACE MEMBERS
-- ============================================================================
INSERT INTO public.workspace_members (user_id, workspace_id, role, display_name, created_at)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'agent', 'Alice Smith', now() - interval '30 days'),
    ('a2222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'agent', 'Bob Jones', now() - interval '30 days'),
    ('a3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', 'manager', 'Carol Manager', now() - interval '30 days'),
    ('b1111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000002', 'agent', 'David Miller', now() - interval '30 days'),
    ('b2222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000002', 'agent', 'Eva Green', now() - interval '30 days'),
    ('b3333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000002', 'manager', 'Frank Director', now() - interval '30 days')
ON CONFLICT (user_id, workspace_id) DO UPDATE SET
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name;

-- ============================================================================
-- 4. CASES — WORKSPACE A (22 Cases)
-- ============================================================================
INSERT INTO public.cases (id, reference, title, description, priority, status, workspace_id, creator_id, assignee_id, resolution_note, created_at, updated_at)
VALUES
    -- Resolved case with full event timeline
    (
        'a0000000-0000-0000-0000-000000000010',
        1,
        'SSO SAML login failure for enterprise domain',
        'Users on acme-enterprise.com domain report intermittent SAML assertion timeouts.',
        'urgent',
        'resolved',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'Updated IdP metadata certificate and verified clock skew tolerance.',
        now() - interval '5 days',
        now() - interval '4 days'
    ),
    (
        'a0000000-0000-0000-0000-000000000011',
        2,
        'Webhook delivery failing with 429 Too Many Requests',
        'Customer webhook endpoint was overwhelmed by batch sync triggers.',
        'high',
        'resolved',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        'Implemented exponential backoff with jitter on webhook retries.',
        now() - interval '4 days',
        now() - interval '3 days'
    ),
    -- Assigned Cases (Assigned to Alice)
    (
        'a0000000-0000-0000-0000-000000000012',
        3,
        'Database query latency spike during billing aggregation',
        'Nightly report aggregation query taking over 45s causing timeouts.',
        'urgent',
        'assigned',
        'a0000000-0000-0000-0000-000000000001',
        'a3333333-3333-3333-3333-333333333333',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        now() - interval '2 days',
        now() - interval '1 day'
    ),
    (
        'a0000000-0000-0000-0000-000000000013',
        4,
        'CSV export encoding issue for Japanese customer names',
        'Kanji characters are exported as garbled mojibake in shift_jis.',
        'medium',
        'assigned',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        now() - interval '2 days',
        now() - interval '1 day'
    ),
    -- Assigned Cases (Assigned to Bob)
    (
        'a0000000-0000-0000-0000-000000000014',
        5,
        'Stripe billing payment method update failure',
        'Customer unable to change default credit card in billing portal.',
        'high',
        'assigned',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        now() - interval '36 hours',
        now() - interval '12 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000015',
        6,
        'Mobile responsive menu clipping on iPhone 15 Pro',
        'Navigation drawer overflows viewport on iOS Safari 17.',
        'low',
        'assigned',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        now() - interval '30 hours',
        now() - interval '10 hours'
    ),
    -- Open Cases (Unassigned)
    (
        'a0000000-0000-0000-0000-000000000016',
        7,
        'URGENT: Production API rate limiting triggering false positives',
        'Customer IP range being throttled incorrectly on /v1/events endpoint.',
        'urgent',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '24 hours',
        now() - interval '24 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000017',
        8,
        'Audit log export missing actor IP address field',
        'SOC2 compliance audit requires client IP address in audit exports.',
        'high',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '20 hours',
        now() - interval '20 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000018',
        9,
        'Dark mode contrast ratio in table headers fails WCAG AA',
        'Color contrast is 3.2:1 instead of required 4.5:1 on muted headers.',
        'medium',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '18 hours',
        now() - interval '18 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000019',
        10,
        'Email notification template missing unsubscribe link in footer',
        'Transactional notification emails must include one-click unsubscribe.',
        'medium',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '16 hours',
        now() - interval '16 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000020',
        11,
        'Update documentation link in user settings modal',
        'Link points to deprecated v1 docs instead of developer portal.',
        'low',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '14 hours',
        now() - interval '14 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000021',
        12,
        'Memory leak in real-time WebSocket subscriber connection',
        'Node process memory increases steadily over 48h period.',
        'urgent',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '12 hours',
        now() - interval '12 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000022',
        13,
        'PDF Invoice generation renders blank page on multi-currency items',
        'Puppeteer PDF engine fails to load custom font for currency glyphs.',
        'high',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '10 hours',
        now() - interval '10 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000023',
        14,
        'Feature Request: Add Slack notifications on critical case creation',
        'Customer success team wants alerts when urgent priority cases arrive.',
        'medium',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '8 hours',
        now() - interval '8 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000024',
        15,
        'Clarify error message on password reset token expiration',
        'Users get generic "Error 400" when clicking expired reset links.',
        'low',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '6 hours',
        now() - interval '6 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000025',
        16,
        'OAuth callback state validation race condition',
        'Concurrent login requests invalidate PKCE code challenge state.',
        'high',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '5 hours',
        now() - interval '5 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000026',
        17,
        'Redis session cache key collision across test environments',
        'Staging and QA sessions occasionally cross-authenticate.',
        'urgent',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '4 hours',
        now() - interval '4 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000027',
        18,
        'API documentation Swagger UI displays incorrect schema for ResolveCaseDto',
        'Swagger shows resolutionNote as optional when API requires non-empty text.',
        'low',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '3 hours',
        now() - interval '3 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000028',
        19,
        'Bulk user invitation fails when email contains uppercase letters',
        'Email normalization in invitations table is case-sensitive.',
        'medium',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '2 hours',
        now() - interval '2 hours'
    ),
    (
        'a0000000-0000-0000-0000-000000000029',
        20,
        'Keyboard shortcut (Cmd+K) does not focus global search on Firefox',
        'Event listener is prevented by Firefox default URL bar shortcut.',
        'low',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '1 hour',
        now() - interval '1 hour'
    ),
    (
        'a0000000-0000-0000-0000-000000000030',
        21,
        'Export analytics dashboard metrics to Excel .xlsx format',
        'Management requests weekly executive summary export.',
        'medium',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '30 minutes',
        now() - interval '30 minutes'
    ),
    (
        'a0000000-0000-0000-0000-000000000031',
        22,
        'Improve toast notification dismiss animation smoothness',
        'Toast flickers slightly on exit transition in Chromium.',
        'low',
        'open',
        'a0000000-0000-0000-0000-000000000001',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '10 minutes',
        now() - interval '10 minutes'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. CASE EVENTS FOR RESOLVED / ASSIGNED CASES (WORKSPACE A)
-- ============================================================================
INSERT INTO public.case_events (id, case_id, workspace_id, event_type, actor_id, payload, created_at)
VALUES
    -- Events for Case #1 (Resolved)
    (
        'a0000000-0000-0000-0001-000000000001',
        'a0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000001',
        'created',
        'a1111111-1111-1111-1111-111111111111',
        '{"title": "SSO SAML login failure for enterprise domain", "priority": "urgent"}'::jsonb,
        now() - interval '5 days'
    ),
    (
        'a0000000-0000-0000-0001-000000000002',
        'a0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000001',
        'claimed',
        'a1111111-1111-1111-1111-111111111111',
        '{"assignee_id": "a1111111-1111-1111-1111-111111111111"}'::jsonb,
        now() - interval '4 days 20 hours'
    ),
    (
        'a0000000-0000-0000-0001-000000000003',
        'a0000000-0000-0000-0000-000000000010',
        'a0000000-0000-0000-0000-000000000001',
        'resolved',
        'a1111111-1111-1111-1111-111111111111',
        '{"resolution_note": "Updated IdP metadata certificate and verified clock skew tolerance."}'::jsonb,
        now() - interval '4 days'
    ),
    -- Events for Case #2 (Resolved)
    (
        'a0000000-0000-0000-0001-000000000004',
        'a0000000-0000-0000-0000-000000000011',
        'a0000000-0000-0000-0000-000000000001',
        'created',
        'a2222222-2222-2222-2222-222222222222',
        '{"title": "Webhook delivery failing with 429 Too Many Requests", "priority": "high"}'::jsonb,
        now() - interval '4 days'
    ),
    (
        'a0000000-0000-0000-0001-000000000005',
        'a0000000-0000-0000-0000-000000000011',
        'a0000000-0000-0000-0000-000000000001',
        'claimed',
        'a2222222-2222-2222-2222-222222222222',
        '{"assignee_id": "a2222222-2222-2222-2222-222222222222"}'::jsonb,
        now() - interval '3 days 18 hours'
    ),
    (
        'a0000000-0000-0000-0001-000000000006',
        'a0000000-0000-0000-0000-000000000011',
        'a0000000-0000-0000-0000-000000000001',
        'resolved',
        'a2222222-2222-2222-2222-222222222222',
        '{"resolution_note": "Implemented exponential backoff with jitter on webhook retries."}'::jsonb,
        now() - interval '3 days'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CASES — WORKSPACE B (Stark Industries - 22 Cases)
-- Including known UUID: b0000000-0000-0000-0000-000000000099
-- ============================================================================
INSERT INTO public.cases (id, reference, title, description, priority, status, workspace_id, creator_id, assignee_id, resolution_note, created_at, updated_at)
VALUES
    -- Target Case for Tenant Isolation Testing (Documented in README / SPEC)
    (
        'b0000000-0000-0000-0000-000000000099',
        1,
        'Top Secret Security Vulnerability Report (Stark Internal)',
        'Confidential audit of Arc Reactor power grid telemetry protocol.',
        'urgent',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '2 days',
        now() - interval '2 days'
    ),
    -- Resolved Case in Workspace B with full timeline
    (
        'b0000000-0000-0000-0000-000000000050',
        2,
        'JARVIS natural language processing model latency regression',
        'Inference latency spiked from 12ms to 180ms after neural net weight update.',
        'urgent',
        'resolved',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        'Reverted quantized transformer layer and restored tensor cache.',
        now() - interval '3 days',
        now() - interval '2 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000051',
        3,
        'Mark 85 armor flight telemetry packet loss over satellite uplink',
        'Packet drop exceeds 8% during high altitude supersonic maneuvers.',
        'high',
        'assigned',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        now() - interval '1 day',
        now() - interval '6 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000052',
        4,
        'Repulsor calibration drift on test stand beta',
        'Output power variance +/- 3.5% after 200 continuous discharge cycles.',
        'medium',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '18 hours',
        now() - interval '18 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000053',
        5,
        'Vibranium alloy inventory sync timeout with Wakanda portal',
        'Inventory tracking REST API returns 504 gateway timeout.',
        'high',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '12 hours',
        now() - interval '12 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000054',
        6,
        'Clean energy grid sensor data ingestion pipeline backpressure',
        'Kafka consumer group lag is growing by 5,000 msg/sec.',
        'urgent',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '8 hours',
        now() - interval '8 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000055',
        7,
        'Stark Tower security badge reader firmware upgrade failure',
        'Access readers on Floor 92 fail to reboot after OTA flash.',
        'low',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '4 hours',
        now() - interval '4 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000056',
        8,
        'Nanotech fabrication printer heating element temperature fluctuation',
        'Bed temperature drops by 15C during high-density mesh generation.',
        'medium',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '3 hours',
        now() - interval '3 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000057',
        9,
        'Satellite orbital decay tracking alert notification channel error',
        'PagerDuty integration received malformed JSON payload.',
        'high',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '2 hours',
        now() - interval '2 hours'
    ),
    (
        'b0000000-0000-0000-0000-000000000058',
        10,
        'Holographic UI rendering frame drop during multi-layer 3D model rotation',
        'Render thread drops below 60fps when displaying armor schematics.',
        'low',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '1 hour',
        now() - interval '1 hour'
    ),
    (
        'b0000000-0000-0000-0000-000000000059',
        11,
        'Quantum encryption key exchange handshake timeout with SHIELD HQ',
        'TLS handshake fails during quantum key exchange negotiation.',
        'urgent',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '45 minutes',
        now() - interval '45 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000060',
        12,
        'Sub-orbital drone tracking beacon battery life reporting anomaly',
        'Telemetry reports 100% battery for 30 consecutive flight hours.',
        'medium',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '30 minutes',
        now() - interval '30 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000061',
        13,
        'Stark Expo ticket reservation portal rate limit exhaustion',
        'Public reservation API depleted rate limit bucket during launch.',
        'high',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '20 minutes',
        now() - interval '20 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000062',
        14,
        'Laboratory air filtration system filter replacement reminder',
        'Cleanroom Level 4 HEPA filters scheduled for preventive maintenance.',
        'low',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '15 minutes',
        now() - interval '15 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000063',
        15,
        'Arc reactor core coolant pressure sensor calibration',
        'Pressure gauge delta exceeds 0.2 bar between redundant transducers.',
        'urgent',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '10 minutes',
        now() - interval '10 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000064',
        16,
        'Autonomous defense drone pathfinding collision warning in high wind',
        'LIDAR obstacle detection triggers false avoidance maneuver in rain.',
        'medium',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '8 minutes',
        now() - interval '8 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000065',
        17,
        'Voice synthesis accent model training dataset formatting error',
        'Audio clips contain variable sample rates causing training crash.',
        'low',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '5 minutes',
        now() - interval '5 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000066',
        18,
        'Thermal imaging camera synchronization delay on stealth perimeter',
        'Frame sync latency reaches 45ms between infrared and visible spectrum.',
        'high',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '4 minutes',
        now() - interval '4 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000067',
        19,
        'Hydraulic lift pressure loss in subterranean assembly bay 3',
        'Main piston seal weeping fluid under 50-ton static load.',
        'medium',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '3 minutes',
        now() - interval '3 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000068',
        20,
        'Facility lighting control system DMX gateway packet corruption',
        'Conference room lighting transitions stutter during scenes.',
        'low',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b2222222-2222-2222-2222-222222222222',
        NULL,
        NULL,
        now() - interval '2 minutes',
        now() - interval '2 minutes'
    ),
    (
        'b0000000-0000-0000-0000-000000000069',
        21,
        'High-voltage power bus insulation resistance test scheduling',
        'Annual dielectric breakdown test required for 10kV substation.',
        'high',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b3333333-3333-3333-3333-333333333333',
        NULL,
        NULL,
        now() - interval '1 minute',
        now() - interval '1 minute'
    ),
    (
        'b0000000-0000-0000-0000-000000000070',
        22,
        'Emergency siren audio file format validation and checksum check',
        'WAV file checksum differs from distributed asset manifest.',
        'urgent',
        'open',
        'b0000000-0000-0000-0000-000000000002',
        'b1111111-1111-1111-1111-111111111111',
        NULL,
        NULL,
        now() - interval '30 seconds',
        now() - interval '30 seconds'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. CASE EVENTS FOR RESOLVED CASE IN WORKSPACE B
-- ============================================================================
INSERT INTO public.case_events (id, case_id, workspace_id, event_type, actor_id, payload, created_at)
VALUES
    (
        'b0000000-0000-0000-0001-000000000001',
        'b0000000-0000-0000-0000-000000000050',
        'b0000000-0000-0000-0000-000000000002',
        'created',
        'b1111111-1111-1111-1111-111111111111',
        '{"title": "JARVIS natural language processing model latency regression", "priority": "urgent"}'::jsonb,
        now() - interval '3 days'
    ),
    (
        'b0000000-0000-0000-0001-000000000002',
        'b0000000-0000-0000-0000-000000000050',
        'b0000000-0000-0000-0000-000000000002',
        'claimed',
        'b1111111-1111-1111-1111-111111111111',
        '{"assignee_id": "b1111111-1111-1111-1111-111111111111"}'::jsonb,
        now() - interval '2 days 12 hours'
    ),
    (
        'b0000000-0000-0000-0001-000000000003',
        'b0000000-0000-0000-0000-000000000050',
        'b0000000-0000-0000-0000-000000000002',
        'resolved',
        'b1111111-1111-1111-1111-111111111111',
        '{"resolution_note": "Reverted quantized transformer layer and restored tensor cache."}'::jsonb,
        now() - interval '2 days'
    )
ON CONFLICT (id) DO NOTHING;
