-- ============================================
-- 88XP Add Deadline and Remarks Columns Migration
-- Adds deadline and remarks support to projects table
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS remarks TEXT;

