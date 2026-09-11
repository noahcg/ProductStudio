-- Expenses represent a product's ongoing cost, not an individual project.
alter table expenses add column product_id uuid references products(id) on delete cascade;

-- Preserve existing expense assignments by moving each one to its project's product.
update expenses
set product_id = projects.product_id
from projects
where expenses.project_id = projects.id
  and expenses.product_id is null;

create index idx_expenses_product on expenses(product_id);

alter table expenses drop column project_id;
