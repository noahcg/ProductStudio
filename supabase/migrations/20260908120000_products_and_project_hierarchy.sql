-- Products are the portfolio-level containers. Existing projects become the
-- initial project in a product with the same name, preserving all child work.
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_products_updated_at before update on products for each row execute function set_updated_at();

alter table projects add column product_id uuid references products(id) on delete cascade;

insert into products (slug, name)
select slug, name from projects
on conflict (slug) do nothing;

update projects
set product_id = products.id
from products
where projects.product_id is null and products.slug = projects.slug;

alter table projects alter column product_id set not null;
create index idx_projects_product on projects(product_id);
