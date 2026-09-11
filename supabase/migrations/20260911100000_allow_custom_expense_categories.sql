-- Expense categories are user-defined. Keep the existing values as suggestions
-- in the app, but permit services such as transactional email, analytics, etc.
alter table expenses drop constraint if exists expenses_category_check;
alter table expense_snapshots drop constraint if exists expense_snapshots_category_check;
