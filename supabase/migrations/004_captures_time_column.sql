-- Add a capture_time column so a memory's time-of-day can be recorded
-- alongside its capture_date, captured in the naming step for every
-- image capture mode.

alter table captures
  add column if not exists capture_time text;
