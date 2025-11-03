-- Drop comments table and related triggers
DROP TRIGGER IF EXISTS update_comment_count ON comments;
DROP FUNCTION IF EXISTS update_problem_comment_count();
DROP TABLE IF EXISTS comments;

-- Remove comment_count column from problems table
ALTER TABLE problems DROP COLUMN IF EXISTS comment_count;
