-- Product roadmaps own strategic initiatives. Existing project-owned items
-- are retained and backfilled to the product that owns their delivery project.

alter table roadmap_items add column product_id uuid references products(id) on delete cascade;

update roadmap_items as roadmap
set product_id = projects.product_id
from projects
where roadmap.project_id = projects.id
  and roadmap.product_id is null;

alter table roadmap_items alter column product_id set not null;
alter table roadmap_items alter column project_id drop not null;

alter table roadmap_items drop constraint roadmap_items_project_id_fkey;
alter table roadmap_items
  add constraint roadmap_items_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;

create index idx_roadmap_items_product on roadmap_items(product_id);
