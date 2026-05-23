alter table public.announcements
  add column if not exists is_pinned boolean not null default false;

create index if not exists announcements_pinned_published_idx
  on public.announcements (is_pinned desc, published_at desc);

create unique index if not exists announcements_single_pinned_idx
  on public.announcements (is_pinned)
  where is_pinned = true;
