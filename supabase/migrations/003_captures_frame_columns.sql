-- Add multi-frame URL arrays to captures so the interactive viewers
-- (SpinSequenceViewer, LenticularViewer, DocumentViewer) can be replayed
-- from the gallery after a capture is saved.

alter table captures
  add column if not exists cloud_frames        text[],
  add column if not exists cloud_relief_frames text[],
  add column if not exists cloud_pages         text[];
