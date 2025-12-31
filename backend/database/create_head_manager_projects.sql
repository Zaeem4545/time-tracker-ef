-- Create table to track which head manager has selected which project
-- Only one head manager can select a project at a time

CREATE TABLE IF NOT EXISTS head_manager_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  head_manager_id INT NOT NULL,
  project_id INT NOT NULL,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (head_manager_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_selection (project_id)
);

-- This ensures:
-- - Each project can only be selected by one head manager
-- - Multiple head managers can select different projects
-- - If a head manager or project is deleted, the selection is removed

