-- Add is_dnf boolean to riders table for live-game DNF tracking
alter table riders
  add column if not exists is_dnf boolean not null default false;
