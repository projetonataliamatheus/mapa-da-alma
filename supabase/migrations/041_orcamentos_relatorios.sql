-- 041: Orçamentos e Relatórios de tráfego (estrutura trazida do sistema feito no Lovable)
-- Criado uma vez só (as tabelas e colunas são as mesmas do sistema original, para o código funcionar igual).
do $lv$
begin
if to_regclass('public.quote_templates') is null then
if to_regtype('public.client_status') is null then
  create type public.client_status as enum ('orcamento', 'negociacao', 'ativo', 'pausado', 'cancelado');
end if;
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_business_type TEXT NOT NULL,
  city TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  color_theme TEXT NOT NULL DEFAULT 'gold-dark',
  plan1_total TEXT NOT NULL DEFAULT 'R$ 2.000',
  plan1_labor TEXT NOT NULL DEFAULT 'R$ 1.100,00',
  plan1_ads TEXT NOT NULL DEFAULT 'R$ 900,00 (R$ 30/dia)',
  plan1_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan2_total TEXT NOT NULL DEFAULT 'R$ 3.000',
  plan2_labor TEXT NOT NULL DEFAULT 'R$ 1.500,00',
  plan2_ads TEXT NOT NULL DEFAULT 'R$ 1.500,00 (R$ 50/dia)',
  plan2_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  status client_status NOT NULL DEFAULT 'orcamento',
  monthly_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 10,
  notes TEXT DEFAULT '',
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.quote_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT DEFAULT ''
);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL;

CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  professional_name text NOT NULL DEFAULT 'Matheus Rangel',
  professional_photo_url text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 5,
  star_color text NOT NULL DEFAULT '#3b82f6',
  services jsonb NOT NULL DEFAULT '["Web Designer","Gestor de Tráfego Pago","Anúncios","Programação & Desenvolvimento","Automações e IA''s"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;

ALTER TABLE public.quotes ADD COLUMN available_colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.quotes ADD COLUMN layout_type text NOT NULL DEFAULT 'simple';

ALTER TABLE public.site_settings ADD COLUMN star_animation text NOT NULL DEFAULT 'none';

CREATE TABLE public.traffic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  period_start date,
  period_end date,
  access_password text,
  access_token text NOT NULL DEFAULT gen_random_uuid()::text,
  layout_theme integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  strategy_notes text DEFAULT '',
  investment_tip text DEFAULT '',
  contact_whatsapp text DEFAULT '',
  contact_email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_traffic_reports_token ON public.traffic_reports(access_token);

CREATE TABLE public.traffic_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  metric_key text NOT NULL DEFAULT '',
  metric_value numeric NOT NULL DEFAULT 0,
  metric_label text NOT NULL DEFAULT '',
  metric_icon text DEFAULT '',
  metric_color text DEFAULT '',
  metric_category text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.traffic_report_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  current_investment numeric NOT NULL DEFAULT 0,
  simulated_investment numeric NOT NULL DEFAULT 0,
  projected_clicks numeric NOT NULL DEFAULT 0,
  projected_leads numeric NOT NULL DEFAULT 0,
  projected_messages numeric NOT NULL DEFAULT 0,
  projected_reach numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS allow_layout_switch boolean NOT NULL DEFAULT true;

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS goal_target numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goal_reference numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strategy_type text DEFAULT '';

CREATE TABLE public.traffic_report_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL DEFAULT '',
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_photo_url text DEFAULT '',
  review_text text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  review_date date DEFAULT CURRENT_DATE,
  reviewer_location text DEFAULT '',
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  review_layout text NOT NULL DEFAULT 'carousel',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  slug text NOT NULL DEFAULT 'simple',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  hero_image_url text DEFAULT '/images/hero-bg.jpg',
  hero_emoji text DEFAULT '🦷',
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  show_on_simple BOOLEAN NOT NULL DEFAULT false,
  show_on_detailed BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_page_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

UPDATE sales_page_config 
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            config::jsonb,
            '{aboutTitle2}', '"Sou o especialista que cuida do seu negócio pessoalmente."'
          ),
          '{aboutSubtitle}', '""'
        ),
        '{aboutBio1}', '"Me chamo Matheus Rangel. Há mais de 10 anos ajudo donos de negócio a conseguir mais clientes usando a internet — sem complicação, sem enrolação."'
      ),
      '{aboutBio2}', '"Quando você me contrata, fala direto comigo. Eu mesmo crio os anúncios, acompanho os resultados e te explico tudo de forma simples, sem termos técnicos difíceis.\n\nNão importa se você tem uma clínica, um salão, uma loja ou qualquer outro negócio — se você quer mais clientes, eu sei como fazer isso acontecer."'
    ),
    '{aboutBio3}', '"Traga seu problema. Eu entrego a solução."'
  ),
  '{aboutBadges}', '[]'
),
updated_at = now()
WHERE id = 'default';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS traffic_reports_slug_unique ON public.traffic_reports (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cnpj text DEFAULT '';

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS copyright_text text DEFAULT '';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS client_company_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS client_contact_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS client_logo_url text DEFAULT '';

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS header_padding integer DEFAULT 40;

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS matrix_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS matrix_effect text DEFAULT 'converge',
  ADD COLUMN IF NOT EXISTS matrix_duration integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS matrix_text text DEFAULT '';

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS matrix_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS matrix_effect text DEFAULT 'converge',
  ADD COLUMN IF NOT EXISTS matrix_duration integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS matrix_text text DEFAULT '';

ALTER TABLE public.traffic_reports 
  ADD COLUMN IF NOT EXISTS whatsapp_widget_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS whatsapp_widget_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS header_bg_type text NOT NULL DEFAULT 'theme',
  ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS header_bg_gradient text DEFAULT 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  ADD COLUMN IF NOT EXISTS header_bg_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS header_matrix_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS header_matrix_color text DEFAULT '#00ff41',
  ADD COLUMN IF NOT EXISTS header_matrix_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS header_matrix_speed integer NOT NULL DEFAULT 30;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT '';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS website_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS website_label text DEFAULT 'Visite o meu site',
ADD COLUMN IF NOT EXISTS website_visible boolean DEFAULT true;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS website_position integer DEFAULT 3;

ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tab_title_prefix text DEFAULT 'Admin - Matheus Rangel',
  ADD COLUMN IF NOT EXISTS tab_title_show_menu boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tab_title_menu_position text DEFAULT 'after';

CREATE TABLE public.traffic_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.traffic_reports(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  upload_label TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS allowed_layouts jsonb DEFAULT '["default","analytics","marketing","corporate","modern","funnel","performance","datatable","executive","dashboard"]'::jsonb;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS plans_config jsonb DEFAULT '[]'::jsonb;

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      sections::jsonb,
      '{strategy_tip}',
      '"Com um investimento inicial acessível, apenas 1 nova venda por dia já cobre todo o custo dos anúncios. O lucro real virá com a recorrência e o aumento do ticket médio. Essa é a Estratégia de Crescimento Sustentável!"'::jsonb
    ),
    '{strategy_items}',
    '[{"emoji": "🎯", "title": "Atração Inteligente", "desc": "Atraímos novos clientes com ofertas estratégicas e depois fidelizamos para aumentar o ticket médio."}, {"emoji": "whatsapp", "title": "WhatsApp Humanizado", "desc": "Atendimento rápido e profissional no X1, transformando cada contato em uma venda confirmada."}, {"emoji": "instagram", "title": "Instagram Estratégico", "desc": "Construímos seu perfil com conteúdo que gera seguidores qualificados e engajamento real."}, {"emoji": "📍", "title": "Tráfego Local Direcionado", "desc": "Anúncios segmentados para o público certo na sua região, maximizando conversão."}]'::jsonb
  ),
  '{metrics_tables}',
  '[{"title": "💰 Expectativa Realista com R$ 30/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "4 a 8 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "1 a 2"], ["Novos Clientes/Mês", "10 a 30"]]}, {"title": "💰 Expectativa Realista com R$ 50/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "7 a 14 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "2 a 3"], ["Novos Clientes/Mês", "20 a 50"]]}]'::jsonb
)
WHERE slug = 'simple';

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      sections::jsonb,
      '{strategy_tip}',
      '"Com um investimento inicial acessível, apenas 1 nova venda por dia já cobre todo o custo dos anúncios. O lucro real virá com a recorrência e o aumento do ticket médio. Essa é a Estratégia de Crescimento Sustentável!"'::jsonb
    ),
    '{strategy_items}',
    '[{"emoji": "🎯", "title": "Atração Inteligente", "desc": "Atraímos novos clientes com ofertas estratégicas e depois fidelizamos para aumentar o ticket médio."}, {"emoji": "whatsapp", "title": "WhatsApp Humanizado", "desc": "Atendimento rápido e profissional no X1, transformando cada contato em uma venda confirmada."}, {"emoji": "instagram", "title": "Instagram Estratégico", "desc": "Construímos seu perfil com conteúdo que gera seguidores qualificados e engajamento real."}, {"emoji": "📍", "title": "Tráfego Local Direcionado", "desc": "Anúncios segmentados para o público certo na sua região, maximizando conversão."}]'::jsonb
  ),
  '{metrics_tables}',
  '[{"title": "💰 Expectativa Realista com R$ 30/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "4 a 8 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "1 a 2"], ["Novos Clientes/Mês", "10 a 30"]]}, {"title": "💰 Expectativa Realista com R$ 50/dia", "rows": [["Custo por Conversa (WhatsApp)", "R$ 3,00 a R$ 8,00"], ["Volume de Contatos/Dia", "7 a 14 pessoas"], ["Taxa de Conversão", "20% com atendimento ágil"], ["Novos Clientes/Dia", "2 a 3"], ["Novos Clientes/Mês", "20 a 50"]]}]'::jsonb
)
WHERE slug = 'detailed';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS hidden_plan_indexes jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS instagram_personal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_business text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT '';

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.traffic_reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text,
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br';

ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'masculino',
  ADD COLUMN IF NOT EXISTS ticket_medio text;

ALTER TABLE public.quote_views ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS quote_views_quote_device_unique ON public.quote_views(quote_id, device_id) WHERE device_id IS NOT NULL;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections::jsonb,
  '{strategy_items,3,emoji}',
  '"gps-pin"'::jsonb
)
WHERE slug IN ('simple','detailed')
  AND sections::jsonb -> 'strategy_items' -> 3 IS NOT NULL;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections::jsonb,
  '{metrics_tables}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (t->>'title') LIKE '💰%'
          THEN jsonb_set(t, '{title}', to_jsonb('money-float ' || regexp_replace(t->>'title','^💰\s*','')))
        ELSE t
      END
    )
    FROM jsonb_array_elements(sections::jsonb -> 'metrics_tables') AS t
  )
)
WHERE slug IN ('simple','detailed')
  AND jsonb_typeof(sections::jsonb -> 'metrics_tables') = 'array';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{strategy_items}',
  (
    SELECT jsonb_agg(
      CASE WHEN item->>'emoji' = '📍' THEN jsonb_set(item, '{emoji}', '"gps-pin"') ELSE item END
    )
    FROM jsonb_array_elements(sections->'strategy_items') item
  )
)
WHERE sections ? 'strategy_items'
  AND sections->'strategy_items' @> '[{"emoji":"📍"}]'::jsonb;

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{metrics_tables}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN tbl->>'title' LIKE '💰 %'
          THEN jsonb_set(tbl, '{title}', to_jsonb('money-float ' || substring(tbl->>'title' from 3)))
        ELSE tbl
      END
    )
    FROM jsonb_array_elements(sections->'metrics_tables') tbl
  )
)
WHERE sections ? 'metrics_tables'
  AND sections::text LIKE '%💰 %';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{howwework_title}',
  to_jsonb(regexp_replace(sections->>'howwework_title', '^🤝\s*', ''))
)
WHERE sections ? 'howwework_title'
  AND sections->>'howwework_title' LIKE '🤝%';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'masculino',
  ADD COLUMN IF NOT EXISTS ticket_medio text;

UPDATE public.quote_templates
SET sections = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          sections,
          '{strategy_items}',
          COALESCE((
            SELECT jsonb_agg(
              CASE
                WHEN item->>'emoji' = '📍' THEN jsonb_set(item, '{emoji}', '"gps-pin"'::jsonb)
                WHEN item->>'emoji' = '🤝' THEN jsonb_set(item, '{emoji}', '"handshake"'::jsonb)
                ELSE item
              END
              ORDER BY ord
            )
            FROM jsonb_array_elements(COALESCE(sections->'strategy_items', '[]'::jsonb)) WITH ORDINALITY AS arr(item, ord)
          ), sections->'strategy_items', '[]'::jsonb)
        ),
        '{howwework_icon}',
        '"handshake"'::jsonb,
        true
      ),
      '{timeline_icon}',
      '"calendar-modern"'::jsonb,
      true
    ),
    '{metrics_icon}',
    '"money-float"'::jsonb,
    true
  ),
  '{metrics_growth_icon}',
  '"rocket-growth"'::jsonb,
  true
)
WHERE slug IN ('simple', 'detailed');

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{metrics_tables}',
  COALESCE((
    SELECT jsonb_agg(
      jsonb_set(
        table_item,
        '{title}',
        to_jsonb(
          regexp_replace(
            regexp_replace(
              regexp_replace(table_item->>'title', '^\s*💰\s*', 'money-float ', 'g'),
              '^\s*money-float\s+', 'money-float ', 'g'
            ),
            '\s*🚀\s*$', '', 'g'
          )
        )
      )
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(sections->'metrics_tables', '[]'::jsonb)) WITH ORDINALITY AS arr(table_item, ord)
  ), sections->'metrics_tables', '[]'::jsonb)
)
WHERE slug IN ('simple', 'detailed')
  AND jsonb_typeof(sections->'metrics_tables') = 'array';

UPDATE public.quote_templates
SET sections = jsonb_set(
  sections,
  '{section_order}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN section_item->>'id' = 'timeline' THEN jsonb_set(section_item, '{icon}', '"calendar-modern"'::jsonb)
        WHEN section_item->>'id' = 'metrics' THEN jsonb_set(section_item, '{icon}', '"money-float"'::jsonb)
        WHEN section_item->>'id' = 'howwework' THEN jsonb_set(section_item, '{icon}', '"handshake"'::jsonb)
        ELSE section_item
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(sections->'section_order', '[]'::jsonb)) WITH ORDINALITY AS arr(section_item, ord)
  ), sections->'section_order', '[]'::jsonb)
)
WHERE slug IN ('simple', 'detailed')
  AND jsonb_typeof(sections->'section_order') = 'array';

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS niche TEXT,
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE public.traffic_metrics 
DROP CONSTRAINT IF EXISTS traffic_metrics_report_id_fkey,
ADD CONSTRAINT traffic_metrics_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_snapshots 
DROP CONSTRAINT IF EXISTS traffic_report_snapshots_report_id_fkey,
ADD CONSTRAINT traffic_report_snapshots_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_creatives 
DROP CONSTRAINT IF EXISTS traffic_report_creatives_report_id_fkey,
ADD CONSTRAINT traffic_report_creatives_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.traffic_report_simulations 
DROP CONSTRAINT IF EXISTS traffic_report_simulations_report_id_fkey,
ADD CONSTRAINT traffic_report_simulations_report_id_fkey 
FOREIGN KEY (report_id) REFERENCES public.traffic_reports(id) ON DELETE CASCADE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_since DATE;

UPDATE public.clients SET client_since = created_at::DATE WHERE client_since IS NULL;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj TEXT;

ALTER TABLE public.traffic_report_snapshots ADD COLUMN campaign_name TEXT;

ALTER TABLE public.traffic_metrics ADD COLUMN campaign_name TEXT;

CREATE INDEX idx_traffic_report_snapshots_campaign ON public.traffic_report_snapshots(report_id, campaign_name);

CREATE INDEX idx_traffic_metrics_campaign ON public.traffic_metrics(report_id, campaign_name);

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS best_plan_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.traffic_metrics
ADD COLUMN IF NOT EXISTS campaign_name text;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS best_plan_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS _schema_sync_temp boolean;

ALTER TABLE public.quotes DROP COLUMN IF EXISTS _schema_sync_temp;

ALTER TABLE public.clients ALTER COLUMN business_type DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN business_type SET DEFAULT '';

ALTER TABLE public.clients ALTER COLUMN city SET DEFAULT '';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS observation TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS due_day TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_type TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_value NUMERIC;

ALTER TABLE public.clients ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN address DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN observation DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN due_day DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN state DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN business_type DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN monthly_value DROP NOT NULL;

ALTER TABLE public.clients ALTER COLUMN status SET DEFAULT 'orcamento';

ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '["Gestor de Tráfego Pago","Especialista em Anúncios","Marketing Digital","Criação de Anúncios","Tráfego para WhatsApp","Criação de Loja Virtual","Criação de Sites","Criação de Landing Page","Web Designer Profissional","Web Designer","Anúncios no Google","Anúncios no Instagram","Anúncios no Facebook","Gestor de Tráfego Limeira","Marketing Digital Limeira","Consultoria em Marketing","SEO","Otimização para Google","Especialista Meta Ads","Especialista Google Ads"]'::jsonb;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS update_info_config jsonb NOT NULL DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_report_snapshots
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS niche text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cpf text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cnpj text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_personal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_business text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_since date,
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS observation text;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text,
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br',
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '';

INSERT INTO public.site_settings (id, seo_keywords)
VALUES (
  'main',
  '["Gestor de Tráfego Pago","Especialista em Anúncios","Marketing Digital","Criação de Anúncios","Tráfego para WhatsApp","Criação de Loja Virtual","Criação de Sites","Criação de Landing Page","Web Designer Profissional","Web Designer","Anúncios no Google","Anúncios no Instagram","Anúncios no Facebook","Gestor de Tráfego Limeira","Marketing Digital Limeira","Consultoria em Marketing","SEO","Otimização para Google","Especialista Meta Ads","Especialista Google Ads"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS seo_title text DEFAULT 'Matheus Rangel — Marketing Digital',
  ADD COLUMN IF NOT EXISTS seo_description text DEFAULT 'Especialista em marketing digital com mais de 10 anos de experiência.',
  ADD COLUMN IF NOT EXISTS seo_og_image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_site_url text DEFAULT 'https://www.matheusrangel.com.br',
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tab_title_prefix text DEFAULT 'Admin - Matheus Rangel',
  ADD COLUMN IF NOT EXISTS tab_title_show_menu boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tab_title_menu_position text DEFAULT 'after';

UPDATE public.site_settings
SET
  seo_title = COALESCE(NULLIF(seo_title, ''), 'Matheus Rangel — Marketing Digital'),
  seo_description = COALESCE(NULLIF(seo_description, ''), 'Especialista em marketing digital com mais de 10 anos de experiência.'),
  seo_og_image_url = COALESCE(seo_og_image_url, ''),
  seo_site_url = COALESCE(NULLIF(seo_site_url, ''), 'https://www.matheusrangel.com.br'),
  seo_keywords = CASE
    WHEN seo_keywords IS NULL OR jsonb_array_length(seo_keywords) = 0 THEN '["Gestor de Tráfego Pago", "Especialista em Anúncios", "Marketing Digital", "Criação de Anúncios", "Tráfego para WhatsApp", "Criação de Loja Virtual", "Criação de Sites", "Criação de Landing Page", "Web Designer Profissional", "Web Designer", "Anúncios no Google", "Anúncios no Instagram", "Anúncios no Facebook", "Gestor de Tráfego Limeira", "Marketing Digital Limeira", "Consultoria em Marketing", "SEO", "Otimização para Google", "Especialista Meta Ads", "Especialista Google Ads"]'::jsonb
    ELSE seo_keywords
  END,
  favicon_url = COALESCE(favicon_url, ''),
  tab_title_prefix = COALESCE(NULLIF(tab_title_prefix, ''), 'Admin - Matheus Rangel'),
  tab_title_show_menu = COALESCE(tab_title_show_menu, true),
  tab_title_menu_position = COALESCE(NULLIF(tab_title_menu_position, ''), 'after')
WHERE id = 'main';

INSERT INTO public.site_settings (id, seo_keywords)
VALUES ('main', '["Gestor de Tráfego Pago", "Especialista em Anúncios", "Marketing Digital", "Criação de Anúncios", "Tráfego para WhatsApp", "Criação de Loja Virtual", "Criação de Sites", "Criação de Landing Page", "Web Designer Profissional", "Web Designer", "Anúncios no Google", "Anúncios no Instagram", "Anúncios no Facebook", "Gestor de Tráfego Limeira", "Marketing Digital Limeira", "Consultoria em Marketing", "SEO", "Otimização para Google", "Especialista Meta Ads", "Especialista Google Ads"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.traffic_reports
ADD COLUMN IF NOT EXISTS update_info_config jsonb NOT NULL DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_reports
ALTER COLUMN update_info_config SET DEFAULT jsonb_build_object(
  'iconName', 'CalendarCheck',
  'iconSize', 18,
  'iconColor', '#00ff41',
  'labelText', 'Data da Última Atualização de Dados:',
  'labelSize', 12,
  'labelColor', '',
  'dateColor', '#00ff41',
  'dateBold', true,
  'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
  'subtitleColor', '#fb923c',
  'subtitleSize', 12,
  'subtitleBold', true
);

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS update_info_config jsonb;

ALTER TABLE public.traffic_reports
  ALTER COLUMN update_info_config SET DEFAULT jsonb_build_object(
    'iconName', 'CalendarCheck',
    'iconSize', 18,
    'iconColor', '#00ff41',
    'labelText', 'Data da Última Atualização de Dados:',
    'labelSize', 12,
    'labelColor', '',
    'dateColor', '#00ff41',
    'dateBold', true,
    'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
    'subtitleColor', '#fb923c',
    'subtitleSize', 12,
    'subtitleBold', true
  );

UPDATE public.traffic_reports
SET update_info_config = COALESCE(
  update_info_config,
  jsonb_build_object(
    'iconName', 'CalendarCheck',
    'iconSize', 18,
    'iconColor', '#00ff41',
    'labelText', 'Data da Última Atualização de Dados:',
    'labelSize', 12,
    'labelColor', '',
    'dateColor', '#00ff41',
    'dateBold', true,
    'subtitleText', 'Esses dados são atualizados semanalmente! 1 vez por semana.',
    'subtitleColor', '#fb923c',
    'subtitleSize', 12,
    'subtitleBold', true
  )
);

ALTER TABLE public.traffic_reports
  ALTER COLUMN update_info_config SET NOT NULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

UPDATE public.quotes q
SET last_viewed_at = sub.max_viewed
FROM (
  SELECT quote_id, MAX(viewed_at) AS max_viewed
  FROM public.quote_views
  GROUP BY quote_id
) sub
WHERE sub.quote_id = q.id AND q.last_viewed_at IS NULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

ALTER TABLE public.quote_templates ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

CREATE INDEX IF NOT EXISTS quote_templates_user_service_idx ON public.quote_templates(user_id, service_type);

CREATE INDEX IF NOT EXISTS quotes_service_type_idx ON public.quotes(service_type);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.quote_templates
ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

ALTER TABLE public.quote_templates
DROP CONSTRAINT IF EXISTS quote_templates_service_type_check;

ALTER TABLE public.quote_templates
ADD CONSTRAINT quote_templates_service_type_check
CHECK (service_type IN ('trafego_pago', 'sites_paginas', 'loja_virtual', 'sistemas_app'));

UPDATE public.quote_templates
SET service_type = 'trafego_pago'
WHERE service_type IS NULL OR service_type = '';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep text, ADD COLUMN IF NOT EXISTS neighborhood text, ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS address_number text, ADD COLUMN IF NOT EXISTS complement text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS internal_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_internal_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_external_viewed_at timestamptz;

ALTER TABLE public.traffic_reports
  ADD COLUMN IF NOT EXISTS internal_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_internal_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_external_viewed_at timestamptz;

ALTER TABLE public.quotes REPLICA IDENTITY FULL;

ALTER TABLE public.traffic_reports REPLICA IDENTITY FULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'trafego_pago';

UPDATE public.sales_page_config
SET config = config - 'audioLoadingUrl' - 'audioClickUrl',
    updated_at = now()
WHERE id = 'default'
  AND (config->>'audioLoadingUrl' LIKE '%mykczkuxhxziivcfwjfk%'
    OR config->>'audioClickUrl' LIKE '%mykczkuxhxziivcfwjfk%');


end if;
end $lv$;

-- ligação com a central de clientes
alter table clients add column if not exists lead_id uuid references leads on delete set null;
insert into site_settings (id) values ('main') on conflict do nothing;
insert into sales_page_config (id) values ('default') on conflict do nothing;

-- segurança: só a equipe (com 2 etapas) mexe; as páginas públicas leem pelo servidor
do $$
declare t text;
begin
  foreach t in array array['quotes','quote_templates','quote_faq_items','quote_views','site_settings','sales_page_config','google_reviews','traffic_metrics','traffic_report_creatives','traffic_report_simulations','traffic_report_snapshots','traffic_reports','clients']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipe on %I', t);
    execute format('create policy equipe on %I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

-- função usada pela tela de relatórios
create or replace function public.update_traffic_snapshot_campaign(_snapshot_id uuid, _campaign_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_report_id uuid; v_file_name text; v_clean text; v_n integer;
begin
  if not public.is_team() then return jsonb_build_object('success', false, 'error', 'Sem permissão para alterar campanha'); end if;
  select report_id, file_name into v_report_id, v_file_name from traffic_report_snapshots where id = _snapshot_id;
  if v_report_id is null then return jsonb_build_object('success', false, 'error', 'Upload não encontrado'); end if;
  v_clean := nullif(trim(coalesce(_campaign_name, '')), '');
  update traffic_report_snapshots set campaign_name = v_clean, upload_label = coalesce(v_clean, upload_label)
   where report_id = v_report_id and (id = _snapshot_id or (v_file_name is not null and file_name = v_file_name));
  get diagnostics v_n = row_count;
  return jsonb_build_object('success', true, 'updated_count', v_n);
end $$;

create or replace function public.can_manage_admin_data(_user_id uuid default null) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_team() $$;

-- imagens enviadas pelos editores de orçamento
do $$
begin
  begin
    insert into storage.buckets (id, name, public) values ('site-assets', 'site-assets', true) on conflict (id) do nothing;
    execute 'drop policy if exists site_assets_enviar on storage.objects';
    execute 'create policy site_assets_enviar on storage.objects for insert to authenticated with check (bucket_id = ''site-assets'' and public.is_team())';
    execute 'drop policy if exists site_assets_trocar on storage.objects';
    execute 'create policy site_assets_trocar on storage.objects for update to authenticated using (bucket_id = ''site-assets'' and public.is_team())';
  exception when others then raise notice 'storage: %', sqlerrm;
  end;
end $$;
