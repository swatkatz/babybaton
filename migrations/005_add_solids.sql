-- Add solids support to feed_details table
-- Adds food_name, quantity, and quantity_unit columns for tracking solid food feedings
-- Updates feed_type CHECK constraint to allow 'solids'

-- Add new columns (all nullable — only used for solids feeds)
ALTER TABLE feed_details ADD COLUMN food_name VARCHAR(200);
ALTER TABLE feed_details ADD COLUMN quantity DECIMAL(6,2) CHECK (quantity > 0);
ALTER TABLE feed_details ADD COLUMN quantity_unit VARCHAR(20) CHECK (quantity_unit IN ('spoons', 'bowls', 'pieces', 'portions'));

-- Update feed_type CHECK constraint to include 'solids'
ALTER TABLE feed_details DROP CONSTRAINT feed_details_feed_type_check;
ALTER TABLE feed_details ADD CONSTRAINT feed_details_feed_type_check CHECK (feed_type IN ('breast_milk', 'formula', 'solids'));
