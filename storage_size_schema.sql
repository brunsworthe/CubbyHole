-- ============================================================
-- CubbyHole — Capture File Size Tracking
-- Adds a column to sum the byte size of all assets uploaded for
-- a capture, powering the dynamic Volumetric Storage Meter.
-- ============================================================

alter table captures
  add column if not exists size_bytes bigint default 0;
