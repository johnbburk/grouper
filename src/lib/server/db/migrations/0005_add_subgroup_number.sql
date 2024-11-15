-- Add subgroup_number column to group_assignments table
ALTER TABLE group_assignments 
ADD COLUMN subgroup_number INTEGER NOT NULL DEFAULT 1; 