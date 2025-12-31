-- Add manager_id column to projects table
-- This allows head managers to assign managers to projects

ALTER TABLE projects 
ADD COLUMN manager_id INT NULL AFTER end_date,
ADD FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- This creates a relationship where:
-- - manager_id can be NULL (project not assigned yet)
-- - If a manager is deleted, their projects are unassigned (SET NULL)


