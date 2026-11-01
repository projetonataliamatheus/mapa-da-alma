-- 032: cada serviço com três planos (Vitalício = pagamento único, Anual, Mensal), cada um liga/desliga para a IA
alter table services add column if not exists annual_price numeric;
alter table services add column if not exists annual_min numeric;
alter table services add column if not exists plan_once boolean not null default true;
alter table services add column if not exists plan_annual boolean not null default false;
alter table services add column if not exists plan_monthly boolean not null default false;
update services set plan_monthly = true where monthly_price is not null and plan_monthly = false;
