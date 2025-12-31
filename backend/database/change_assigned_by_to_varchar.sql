-- Change assigned_by column from INT to VARCHAR to accept names
ALTER TABLE tasks MODIFY COLUMN assigned_by VARCHAR(255) NULL;

