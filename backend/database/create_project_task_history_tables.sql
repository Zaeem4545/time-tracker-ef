-- Create project_history table to track project changes
CREATE TABLE IF NOT EXISTS project_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'update, delete',
  field_name VARCHAR(100) NULL COMMENT 'Name of the field that was changed (null for delete)',
  old_value TEXT NULL COMMENT 'Previous value',
  new_value TEXT NULL COMMENT 'New value',
  changed_by INT NULL COMMENT 'User ID who made the change',
  changed_by_name VARCHAR(255) NULL COMMENT 'Name of user who made the change',
  changed_by_email VARCHAR(255) NULL COMMENT 'Email of user who made the change',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_history table to track task changes
CREATE TABLE IF NOT EXISTS task_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NULL COMMENT 'Task ID (null if task was deleted)',
  project_id INT NOT NULL COMMENT 'Project ID (always kept even if task is deleted)',
  action VARCHAR(50) NOT NULL COMMENT 'create, update, delete',
  field_name VARCHAR(100) NULL COMMENT 'Name of the field that was changed (null for create/delete)',
  old_value TEXT NULL COMMENT 'Previous value',
  new_value TEXT NULL COMMENT 'New value',
  task_title VARCHAR(255) NULL COMMENT 'Task title (kept even if task is deleted)',
  changed_by INT NULL COMMENT 'User ID who made the change',
  changed_by_name VARCHAR(255) NULL COMMENT 'Name of user who made the change',
  changed_by_email VARCHAR(255) NULL COMMENT 'Email of user who made the change',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_id (task_id),
  INDEX idx_project_id (project_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

