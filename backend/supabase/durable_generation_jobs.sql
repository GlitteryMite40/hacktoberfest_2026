-- Kalp.io durable generation jobs
-- Run once in the Supabase SQL Editor. This is additive; it does not alter existing tables.

create table if not exists public.generation_jobs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    owner_id uuid not null,
    stage text not null check (stage in (
        'requirements', 'architecture', 'decomposition', 'acceptance_criteria'
    )),
    status text not null default 'queued'
        check (status in ('queued', 'running', 'completed', 'failed')),
    attempts integer not null default 0 check (attempts >= 0),
    max_attempts integer not null default 3 check (max_attempts between 1 and 10),
    available_at timestamptz not null default now(),
    locked_at timestamptz,
    worker_id text,
    error text,
    result jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    finished_at timestamptz
);

create index if not exists generation_jobs_claim_idx
    on public.generation_jobs (status, available_at, created_at);

create index if not exists generation_jobs_project_idx
    on public.generation_jobs (project_id, created_at desc);

alter table public.generation_jobs enable row level security;
revoke all on public.generation_jobs from anon, authenticated;
grant select, insert, update, delete on public.generation_jobs to service_role;

create or replace function public.claim_generation_job(
    p_worker_id text,
    p_lease_seconds integer default 900
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if p_worker_id is null or length(trim(p_worker_id)) = 0 then
        raise exception 'worker id is required';
    end if;
    if p_lease_seconds < 60 or p_lease_seconds > 3600 then
        raise exception 'lease must be between 60 and 3600 seconds';
    end if;

    return query
    with candidate as (
        select j.id
        from public.generation_jobs as j
        where (
            (j.status = 'queued' and j.available_at <= now())
            or
            (j.status = 'running' and j.locked_at < now() - make_interval(secs => p_lease_seconds)
             and j.attempts < j.max_attempts)
        )
        order by j.available_at, j.created_at
        for update skip locked
        limit 1
    )
    update public.generation_jobs as j
    set status = 'running',
        attempts = j.attempts + 1,
        locked_at = now(),
        worker_id = p_worker_id,
        updated_at = now(),
        error = null,
        finished_at = null
    from candidate
    where j.id = candidate.id
    returning j.*;
end;
$$;

revoke all on function public.claim_generation_job(text, integer) from public, anon, authenticated;
grant execute on function public.claim_generation_job(text, integer) to service_role;
