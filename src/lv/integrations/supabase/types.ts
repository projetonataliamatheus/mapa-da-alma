// @ts-nocheck
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          link_url: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      asaas_accounts: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          created_at: string
          environment: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      asaas_charges: {
        Row: {
          amount: number
          asaas_account_id: string | null
          asaas_customer_id: string | null
          asaas_id: string | null
          asaas_subscription_id: string | null
          billing_type: string
          charge_type: string
          checkout_product_id: string | null
          client_id: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          cycle: string | null
          description: string | null
          due_date: string | null
          email: string | null
          id: string
          invoice_url: string | null
          metadata: Json
          net_value: number | null
          next_due_date: string | null
          notes: string | null
          paid_at: string | null
          payment_methods: string[]
          phone: string | null
          pix_copy_paste: string | null
          pix_expiration_date: string | null
          pix_qr_code: string | null
          receipt_id: string | null
          recurring: boolean
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_account_id?: string | null
          asaas_customer_id?: string | null
          asaas_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          charge_type?: string
          checkout_product_id?: string | null
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          cycle?: string | null
          description?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json
          net_value?: number | null
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_methods?: string[]
          phone?: string | null
          pix_copy_paste?: string | null
          pix_expiration_date?: string | null
          pix_qr_code?: string | null
          receipt_id?: string | null
          recurring?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_account_id?: string | null
          asaas_customer_id?: string | null
          asaas_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          charge_type?: string
          checkout_product_id?: string | null
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          cycle?: string | null
          description?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json
          net_value?: number | null
          next_due_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_methods?: string[]
          phone?: string | null
          pix_copy_paste?: string | null
          pix_expiration_date?: string | null
          pix_qr_code?: string | null
          receipt_id?: string | null
          recurring?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_charges_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          asaas_account_id: string | null
          asaas_customer_id: string
          client_id: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          asaas_account_id?: string | null
          asaas_customer_id: string
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          asaas_account_id?: string | null
          asaas_customer_id?: string
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_health_pings: {
        Row: {
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          source: string | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          source?: string | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          source?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      asaas_subscriptions: {
        Row: {
          asaas_account_id: string | null
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type: string
          checkout_product_id: string | null
          client_id: string | null
          created_at: string
          cycle: string
          description: string | null
          end_date: string | null
          id: string
          max_payments: number | null
          metadata: Json
          next_due_date: string | null
          status: string
          subscription_type: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_account_id?: string | null
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type?: string
          checkout_product_id?: string | null
          client_id?: string | null
          created_at?: string
          cycle?: string
          description?: string | null
          end_date?: string | null
          id?: string
          max_payments?: number | null
          metadata?: Json
          next_due_date?: string | null
          status?: string
          subscription_type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          asaas_account_id?: string | null
          asaas_customer_id?: string
          asaas_subscription_id?: string
          billing_type?: string
          checkout_product_id?: string | null
          client_id?: string | null
          created_at?: string
          cycle?: string
          description?: string | null
          end_date?: string | null
          id?: string
          max_payments?: number | null
          metadata?: Json
          next_due_date?: string | null
          status?: string
          subscription_type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_subscriptions_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          created_at: string
          error_message: string | null
          file_size: number | null
          file_url: string | null
          id: string
          records_count: number | null
          status: string
          tables_count: number | null
          trigger_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          records_count?: number | null
          status?: string
          tables_count?: number | null
          trigger_type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          records_count?: number | null
          status?: string
          tables_count?: number | null
          trigger_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkout_links: {
        Row: {
          asaas_account_id: string | null
          created_at: string
          id: string
          name: string
          platform: string
          url: string
        }
        Insert: {
          asaas_account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          platform?: string
          url?: string
        }
        Update: {
          asaas_account_id?: string | null
          created_at?: string
          id?: string
          name?: string
          platform?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_links_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_products: {
        Row: {
          active: boolean
          amount: number
          asaas_account_id: string | null
          asaas_payment_link_id: string | null
          asaas_payment_link_url: string | null
          auto_generate_receipt: boolean
          billing_type: string
          charge_type: string
          created_at: string
          created_by: string | null
          cycle: string | null
          description: string | null
          id: string
          max_payments: number | null
          metadata: Json
          name: string
          service_type: string | null
          slug: string
          success_redirect_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          asaas_account_id?: string | null
          asaas_payment_link_id?: string | null
          asaas_payment_link_url?: string | null
          auto_generate_receipt?: boolean
          billing_type?: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          cycle?: string | null
          description?: string | null
          id?: string
          max_payments?: number | null
          metadata?: Json
          name: string
          service_type?: string | null
          slug: string
          success_redirect_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          asaas_account_id?: string | null
          asaas_payment_link_id?: string | null
          asaas_payment_link_url?: string | null
          auto_generate_receipt?: boolean
          billing_type?: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          cycle?: string | null
          description?: string | null
          id?: string
          max_payments?: number | null
          metadata?: Json
          name?: string
          service_type?: string | null
          slug?: string
          success_redirect_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_products_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_theme_config: {
        Row: {
          accent_color: string
          animation_speed: number
          background_id: string
          custom_bg_opacity: number
          enable_floating_icons: boolean
          enable_rocket: boolean
          icons_opacity: number
          icons_size: number
          id: string
          layout_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          animation_speed?: number
          background_id?: string
          custom_bg_opacity?: number
          enable_floating_icons?: boolean
          enable_rocket?: boolean
          icons_opacity?: number
          icons_size?: number
          id?: string
          layout_id?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          animation_speed?: number
          background_id?: string
          custom_bg_opacity?: number
          enable_floating_icons?: boolean
          enable_rocket?: boolean
          icons_opacity?: number
          icons_size?: number
          id?: string
          layout_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_credentials: {
        Row: {
          client_id: string
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          label: string
          notes: string | null
          password_value: string | null
          sort_order: number
          updated_at: string
          url: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          credential_type?: string
          expires_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          password_value?: string | null
          sort_order?: number
          updated_at?: string
          url?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          credential_type?: string
          expires_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          password_value?: string | null
          sort_order?: number
          updated_at?: string
          url?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          note_type: string
          pinned: boolean
          sort_order: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          note_type?: string
          pinned?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          note_type?: string
          pinned?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_number: string | null
          avatar_url: string | null
          business_type: string
          cep: string | null
          city: string
          client_since: string | null
          cnpj: string | null
          company_name: string | null
          complement: string | null
          cpf: string | null
          cpf_cnpj: string | null
          created_at: string
          drive_folder_url: string | null
          due_day: number
          email: string | null
          gender: string | null
          id: string
          instagram: string | null
          instagram_business: string | null
          instagram_personal: string | null
          monthly_value: number
          name: string
          neighborhood: string | null
          niche: string | null
          notes: string | null
          observation: string | null
          phone: string | null
          quote_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          street: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          avatar_url?: string | null
          business_type?: string
          cep?: string | null
          city?: string
          client_since?: string | null
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          cpf?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          drive_folder_url?: string | null
          due_day?: number
          email?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          instagram_business?: string | null
          instagram_personal?: string | null
          monthly_value?: number
          name: string
          neighborhood?: string | null
          niche?: string | null
          notes?: string | null
          observation?: string | null
          phone?: string | null
          quote_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          avatar_url?: string | null
          business_type?: string
          cep?: string | null
          city?: string
          client_since?: string | null
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          cpf?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          drive_folder_url?: string | null
          due_day?: number
          email?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          instagram_business?: string | null
          instagram_personal?: string | null
          monthly_value?: number
          name?: string
          neighborhood?: string | null
          niche?: string | null
          notes?: string | null
          observation?: string | null
          phone?: string | null
          quote_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          sort_order: number
          title: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          sort_order?: number
          title: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      contracts: {
        Row: {
          body: string
          client_address: string | null
          client_document: string | null
          client_email: string | null
          client_id: string | null
          client_ip: string | null
          client_name: string
          client_phone: string | null
          client_signature: string | null
          client_signed_at: string | null
          client_user_agent: string | null
          contractor_document: string | null
          contractor_email: string | null
          contractor_name: string
          created_at: string
          created_by: string | null
          document_hash: string | null
          duration_months: number | null
          id: string
          payment_terms: string | null
          provider_ip: string | null
          provider_signature: string | null
          provider_signed_at: string | null
          provider_user_agent: string | null
          sent_at: string | null
          service_scope: string | null
          service_value: number | null
          status: string
          template_id: string | null
          template_key: string
          title: string
          token: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_ip?: string | null
          client_name: string
          client_phone?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          client_user_agent?: string | null
          contractor_document?: string | null
          contractor_email?: string | null
          contractor_name?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          duration_months?: number | null
          id?: string
          payment_terms?: string | null
          provider_ip?: string | null
          provider_signature?: string | null
          provider_signed_at?: string | null
          provider_user_agent?: string | null
          sent_at?: string | null
          service_scope?: string | null
          service_value?: number | null
          status?: string
          template_id?: string | null
          template_key: string
          title: string
          token?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          client_address?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_ip?: string | null
          client_name?: string
          client_phone?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          client_user_agent?: string | null
          contractor_document?: string | null
          contractor_email?: string | null
          contractor_name?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          duration_months?: number | null
          id?: string
          payment_terms?: string | null
          provider_ip?: string | null
          provider_signature?: string | null
          provider_signed_at?: string | null
          provider_user_agent?: string | null
          sent_at?: string | null
          service_scope?: string | null
          service_value?: number | null
          status?: string
          template_id?: string | null
          template_key?: string
          title?: string
          token?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_assinaturas: {
        Row: {
          assinatura_cliente: string | null
          assinatura_vendedor: string | null
          cliente_assinado_em: string | null
          cliente_id: string | null
          cliente_ip: string | null
          cliente_user_agent: string | null
          cobranca_id: string | null
          contrato_id: string
          created_at: string
          expires_at: string
          id: string
          metodo_escolhido_em: string | null
          metodo_pagamento_escolhido:
            | Database["public"]["Enums"]["metodo_pagamento_contrato"]
            | null
          status: Database["public"]["Enums"]["status_assinatura_remota"]
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          token: string
          updated_at: string
          vendedor_assinado_em: string | null
          vendedor_id: string | null
          vendedor_ip: string | null
        }
        Insert: {
          assinatura_cliente?: string | null
          assinatura_vendedor?: string | null
          cliente_assinado_em?: string | null
          cliente_id?: string | null
          cliente_ip?: string | null
          cliente_user_agent?: string | null
          cobranca_id?: string | null
          contrato_id: string
          created_at?: string
          expires_at?: string
          id?: string
          metodo_escolhido_em?: string | null
          metodo_pagamento_escolhido?:
            | Database["public"]["Enums"]["metodo_pagamento_contrato"]
            | null
          status?: Database["public"]["Enums"]["status_assinatura_remota"]
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          token?: string
          updated_at?: string
          vendedor_assinado_em?: string | null
          vendedor_id?: string | null
          vendedor_ip?: string | null
        }
        Update: {
          assinatura_cliente?: string | null
          assinatura_vendedor?: string | null
          cliente_assinado_em?: string | null
          cliente_id?: string | null
          cliente_ip?: string | null
          cliente_user_agent?: string | null
          cobranca_id?: string | null
          contrato_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          metodo_escolhido_em?: string | null
          metodo_pagamento_escolhido?:
            | Database["public"]["Enums"]["metodo_pagamento_contrato"]
            | null
          status?: Database["public"]["Enums"]["status_assinatura_remota"]
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_contrato"]
          token?: string
          updated_at?: string
          vendedor_assinado_em?: string | null
          vendedor_id?: string | null
          vendedor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_assinaturas_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "asaas_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_assinaturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_servico: {
        Row: {
          assinado_em: string | null
          assinado_ip: string | null
          assinado_por_nome: string | null
          assinatura_cliente: string | null
          assinatura_prestador: string | null
          cliente_id: string | null
          condicoes_pagamento: Json | null
          contratada_snapshot: Json
          contratante_snapshot: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dias_aviso_cancelamento: number
          dias_homologacao: number | null
          dominio: string | null
          escopo_customizado: string | null
          id: string
          inicio: string | null
          numero: number
          plano_id: string | null
          plano_snapshot: Json
          status: Database["public"]["Enums"]["status_contrato_servico"]
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          titulo: string | null
          updated_at: string
          valor_projeto_customizado: number | null
        }
        Insert: {
          assinado_em?: string | null
          assinado_ip?: string | null
          assinado_por_nome?: string | null
          assinatura_cliente?: string | null
          assinatura_prestador?: string | null
          cliente_id?: string | null
          condicoes_pagamento?: Json | null
          contratada_snapshot?: Json
          contratante_snapshot?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_aviso_cancelamento?: number
          dias_homologacao?: number | null
          dominio?: string | null
          escopo_customizado?: string | null
          id?: string
          inicio?: string | null
          numero?: number
          plano_id?: string | null
          plano_snapshot?: Json
          status?: Database["public"]["Enums"]["status_contrato_servico"]
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          titulo?: string | null
          updated_at?: string
          valor_projeto_customizado?: number | null
        }
        Update: {
          assinado_em?: string | null
          assinado_ip?: string | null
          assinado_por_nome?: string | null
          assinatura_cliente?: string | null
          assinatura_prestador?: string | null
          cliente_id?: string | null
          condicoes_pagamento?: Json | null
          contratada_snapshot?: Json
          contratante_snapshot?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_aviso_cancelamento?: number
          dias_homologacao?: number | null
          dominio?: string | null
          escopo_customizado?: string | null
          id?: string
          inicio?: string | null
          numero?: number
          plano_id?: string | null
          plano_snapshot?: Json
          status?: Database["public"]["Enums"]["status_contrato_servico"]
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_contrato"]
          titulo?: string | null
          updated_at?: string
          valor_projeto_customizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_servico_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_scripts: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          id: string
          name: string
          position: string | null
          priority: number | null
          type: string | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          position?: string | null
          priority?: number | null
          type?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          position?: string | null
          priority?: number | null
          type?: string | null
        }
        Relationships: []
      }
      empresa_contratada_config: {
        Row: {
          cidade_uf: string
          created_at: string
          documento: string
          email: string
          endereco: string
          id: string
          razao_social: string
          representante: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cidade_uf?: string
          created_at?: string
          documento?: string
          email?: string
          endereco?: string
          id?: string
          razao_social?: string
          representante?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          cidade_uf?: string
          created_at?: string
          documento?: string
          email?: string
          endereco?: string
          id?: string
          razao_social?: string
          representante?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      google_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_date: string | null
          review_layout: string
          review_text: string
          reviewer_location: string | null
          reviewer_name: string
          reviewer_photo_url: string | null
          sort_order: number
          source: string
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number
          review_date?: string | null
          review_layout?: string
          review_text?: string
          reviewer_location?: string | null
          reviewer_name?: string
          reviewer_photo_url?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_date?: string | null
          review_layout?: string
          review_text?: string
          reviewer_location?: string | null
          reviewer_name?: string
          reviewer_photo_url?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: []
      }
      page_views: {
        Row: {
          device_id: string
          first_viewed_at: string
          id: string
          is_internal: boolean
          last_viewed_at: string
          target_id: string
          target_type: string
          user_agent: string | null
          user_id: string | null
          view_hits: number
        }
        Insert: {
          device_id: string
          first_viewed_at?: string
          id?: string
          is_internal?: boolean
          last_viewed_at?: string
          target_id: string
          target_type: string
          user_agent?: string | null
          user_id?: string | null
          view_hits?: number
        }
        Update: {
          device_id?: string
          first_viewed_at?: string
          id?: string
          is_internal?: boolean
          last_viewed_at?: string
          target_id?: string
          target_type?: string
          user_agent?: string | null
          user_id?: string | null
          view_hits?: number
        }
        Relationships: []
      }
      payment_webhooks: {
        Row: {
          asaas_account_id: string | null
          created_at: string
          error_message: string | null
          external_id: string | null
          id: string
          payload: Json
          platform: string
          processed_at: string | null
          status: string | null
        }
        Insert: {
          asaas_account_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          platform: string
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          asaas_account_id?: string | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          platform?: string
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhooks_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          asaas_account_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string
          entry_type: string | null
          external_id: string | null
          id: string
          paid_date: string | null
          payer_data: Json | null
          payment_method: string
          payment_type: string
          platform: string
          status: string
          transaction_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          asaas_account_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          entry_type?: string | null
          external_id?: string | null
          id?: string
          paid_date?: string | null
          payer_data?: Json | null
          payment_method?: string
          payment_type?: string
          platform?: string
          status?: string
          transaction_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          asaas_account_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entry_type?: string | null
          external_id?: string | null
          id?: string
          paid_date?: string | null
          payer_data?: Json | null
          payment_method?: string
          payment_type?: string
          platform?: string
          status?: string
          transaction_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_asaas_account_id_fkey"
            columns: ["asaas_account_id"]
            isOneToOne: false
            referencedRelation: "asaas_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_servico: {
        Row: {
          ativo: boolean
          config_extra: Json
          created_at: string
          descricao: string | null
          descricao_escopo_padrao: string | null
          id: string
          itens_inclusos: Json
          limite_produtos: number
          nome: string
          numero_paginas: number | null
          numero_parcelas_criacao: number
          ordem: number
          plataforma: string | null
          prazo_entrega_dias: number
          revisoes_incluidas: number | null
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          updated_at: string
          valor_criacao: number
          valor_diario_sugerido: number
          valor_manutencao_mensal: number
          valor_mao_de_obra: number
          valor_projeto_base: number | null
          valor_trafego_sugerido: number
        }
        Insert: {
          ativo?: boolean
          config_extra?: Json
          created_at?: string
          descricao?: string | null
          descricao_escopo_padrao?: string | null
          id?: string
          itens_inclusos?: Json
          limite_produtos?: number
          nome: string
          numero_paginas?: number | null
          numero_parcelas_criacao?: number
          ordem?: number
          plataforma?: string | null
          prazo_entrega_dias?: number
          revisoes_incluidas?: number | null
          tipo_servico: Database["public"]["Enums"]["tipo_servico_contrato"]
          updated_at?: string
          valor_criacao?: number
          valor_diario_sugerido?: number
          valor_manutencao_mensal?: number
          valor_mao_de_obra?: number
          valor_projeto_base?: number | null
          valor_trafego_sugerido?: number
        }
        Update: {
          ativo?: boolean
          config_extra?: Json
          created_at?: string
          descricao?: string | null
          descricao_escopo_padrao?: string | null
          id?: string
          itens_inclusos?: Json
          limite_produtos?: number
          nome?: string
          numero_paginas?: number | null
          numero_parcelas_criacao?: number
          ordem?: number
          plataforma?: string | null
          prazo_entrega_dias?: number
          revisoes_incluidas?: number | null
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_contrato"]
          updated_at?: string
          valor_criacao?: number
          valor_diario_sugerido?: number
          valor_manutencao_mensal?: number
          valor_mao_de_obra?: number
          valor_projeto_base?: number | null
          valor_trafego_sugerido?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          photo_url: string | null
          role: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      quote_faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          show_on_detailed: boolean
          show_on_simple: boolean
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          show_on_detailed?: boolean
          show_on_simple?: boolean
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          show_on_detailed?: boolean
          show_on_simple?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_templates: {
        Row: {
          created_at: string
          hero_emoji: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          name: string
          sections: Json
          service_type: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hero_emoji?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections?: Json
          service_type?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hero_emoji?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections?: Json
          service_type?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_views: {
        Row: {
          id: string
          ip_address: string | null
          quote_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          quote_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          quote_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_views_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          available_colors: Json | null
          best_plan_config: Json | null
          city: string
          client_business_type: string
          client_gender: string
          client_name: string
          color_theme: string
          created_at: string
          external_view_count: number
          gender: string | null
          id: string
          internal_view_count: number
          last_external_viewed_at: string | null
          last_internal_viewed_at: string | null
          last_viewed_at: string | null
          layout_type: string
          matrix_color: string | null
          matrix_duration: number | null
          matrix_effect: string | null
          matrix_enabled: boolean | null
          matrix_text: string | null
          password: string | null
          plan1_ads: string
          plan1_items: Json
          plan1_labor: string
          plan1_total: string
          plan2_ads: string
          plan2_items: Json
          plan2_labor: string
          plan2_total: string
          plans_config: Json | null
          service_type: string
          slug: string
          subtitle: string
          ticket_medio: string | null
          updated_at: string
          user_id: string
          view_count: number
          whatsapp_number: string | null
          whatsapp_widget_config: Json | null
        }
        Insert: {
          available_colors?: Json | null
          best_plan_config?: Json | null
          city: string
          client_business_type: string
          client_gender?: string
          client_name: string
          color_theme?: string
          created_at?: string
          external_view_count?: number
          gender?: string | null
          id?: string
          internal_view_count?: number
          last_external_viewed_at?: string | null
          last_internal_viewed_at?: string | null
          last_viewed_at?: string | null
          layout_type?: string
          matrix_color?: string | null
          matrix_duration?: number | null
          matrix_effect?: string | null
          matrix_enabled?: boolean | null
          matrix_text?: string | null
          password?: string | null
          plan1_ads?: string
          plan1_items?: Json
          plan1_labor?: string
          plan1_total?: string
          plan2_ads?: string
          plan2_items?: Json
          plan2_labor?: string
          plan2_total?: string
          plans_config?: Json | null
          service_type?: string
          slug: string
          subtitle?: string
          ticket_medio?: string | null
          updated_at?: string
          user_id: string
          view_count?: number
          whatsapp_number?: string | null
          whatsapp_widget_config?: Json | null
        }
        Update: {
          available_colors?: Json | null
          best_plan_config?: Json | null
          city?: string
          client_business_type?: string
          client_gender?: string
          client_name?: string
          color_theme?: string
          created_at?: string
          external_view_count?: number
          gender?: string | null
          id?: string
          internal_view_count?: number
          last_external_viewed_at?: string | null
          last_internal_viewed_at?: string | null
          last_viewed_at?: string | null
          layout_type?: string
          matrix_color?: string | null
          matrix_duration?: number | null
          matrix_effect?: string | null
          matrix_enabled?: boolean | null
          matrix_text?: string | null
          password?: string | null
          plan1_ads?: string
          plan1_items?: Json
          plan1_labor?: string
          plan1_total?: string
          plan2_ads?: string
          plan2_items?: Json
          plan2_labor?: string
          plan2_total?: string
          plans_config?: Json | null
          service_type?: string
          slug?: string
          subtitle?: string
          ticket_medio?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number
          whatsapp_number?: string | null
          whatsapp_widget_config?: Json | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          beneficiary_document: string | null
          beneficiary_email: string | null
          beneficiary_name: string | null
          client_id: string | null
          config: Json
          created_at: string
          id: string
          observations: string | null
          payer_document: string | null
          payer_name: string
          payer_state: string | null
          payment_date: string
          products: Json
          receipt_number: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          beneficiary_document?: string | null
          beneficiary_email?: string | null
          beneficiary_name?: string | null
          client_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          observations?: string | null
          payer_document?: string | null
          payer_name: string
          payer_state?: string | null
          payment_date?: string
          products?: Json
          receipt_number: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          beneficiary_document?: string | null
          beneficiary_email?: string | null
          beneficiary_name?: string | null
          client_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          observations?: string | null
          payer_document?: string | null
          payer_name?: string
          payer_state?: string | null
          payment_date?: string
          products?: Json
          receipt_number?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_page_clicks: {
        Row: {
          button_id: string
          button_label: string | null
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          button_id?: string
          button_label?: string | null
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          button_id?: string
          button_label?: string | null
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      sales_page_config: {
        Row: {
          config: Json
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_page_health_pings: {
        Row: {
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          source: string | null
          status_code: number | null
          url: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          source?: string | null
          status_code?: number | null
          url?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          source?: string | null
          status_code?: number | null
          url?: string | null
        }
        Relationships: []
      }
      sales_page_visits: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          id: string
          page_url: string | null
          referrer: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      seo_cities: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          pages_count: number | null
          type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          pages_count?: number | null
          type?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          pages_count?: number | null
          type?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          active: boolean | null
          city: string | null
          created_at: string | null
          id: string
          keyword: string
          slug: string
          state: string | null
          type: string
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          slug: string
          state?: string | null
          type?: string
        }
        Update: {
          active?: boolean | null
          city?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          slug?: string
          state?: string | null
          type?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          base_price: number
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          service_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          catalog_id: string | null
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          payment_status: string
          platform: string | null
          service_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          catalog_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          platform?: string | null
          service_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          catalog_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          platform?: string | null
          service_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      site_integrations: {
        Row: {
          active: boolean | null
          config: Json | null
          created_at: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          active?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          cnpj: string | null
          copyright_text: string | null
          favicon_url: string | null
          id: string
          professional_name: string
          professional_photo_url: string
          rating: number
          seo_description: string | null
          seo_keywords: Json
          seo_og_image_url: string | null
          seo_site_url: string | null
          seo_title: string | null
          services: Json
          star_animation: string
          star_color: string
          tab_title_menu_position: string | null
          tab_title_prefix: string | null
          tab_title_show_menu: boolean | null
          updated_at: string
          website_label: string | null
          website_position: number | null
          website_url: string | null
          website_visible: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          cnpj?: string | null
          copyright_text?: string | null
          favicon_url?: string | null
          id?: string
          professional_name?: string
          professional_photo_url?: string
          rating?: number
          seo_description?: string | null
          seo_keywords?: Json
          seo_og_image_url?: string | null
          seo_site_url?: string | null
          seo_title?: string | null
          services?: Json
          star_animation?: string
          star_color?: string
          tab_title_menu_position?: string | null
          tab_title_prefix?: string | null
          tab_title_show_menu?: boolean | null
          updated_at?: string
          website_label?: string | null
          website_position?: number | null
          website_url?: string | null
          website_visible?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          cnpj?: string | null
          copyright_text?: string | null
          favicon_url?: string | null
          id?: string
          professional_name?: string
          professional_photo_url?: string
          rating?: number
          seo_description?: string | null
          seo_keywords?: Json
          seo_og_image_url?: string | null
          seo_site_url?: string | null
          seo_title?: string | null
          services?: Json
          star_animation?: string
          star_color?: string
          tab_title_menu_position?: string | null
          tab_title_prefix?: string | null
          tab_title_show_menu?: boolean | null
          updated_at?: string
          website_label?: string | null
          website_position?: number | null
          website_url?: string | null
          website_visible?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      system_events: {
        Row: {
          created_at: string
          id: string
          level: string
          link_url: string | null
          message: string | null
          metadata: Json
          source: string
          title: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          link_url?: string | null
          message?: string | null
          metadata?: Json
          source?: string
          title: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          link_url?: string | null
          message?: string | null
          metadata?: Json
          source?: string
          title?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_permissions: {
        Row: {
          allowed_sidebar_items: Json
          allowed_tabs: Json
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_manage_team: boolean
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_master: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_sidebar_items?: Json
          allowed_tabs?: Json
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_manage_team?: boolean
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_sidebar_items?: Json
          allowed_tabs?: Json
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_manage_team?: boolean
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      traffic_metrics: {
        Row: {
          campaign_name: string | null
          created_at: string
          id: string
          metric_category: string | null
          metric_color: string | null
          metric_icon: string | null
          metric_key: string
          metric_label: string
          metric_value: number
          report_id: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          id?: string
          metric_category?: string | null
          metric_color?: string | null
          metric_icon?: string | null
          metric_key?: string
          metric_label?: string
          metric_value?: number
          report_id: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          id?: string
          metric_category?: string | null
          metric_color?: string | null
          metric_icon?: string | null
          metric_key?: string
          metric_label?: string
          metric_value?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_metrics_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "traffic_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_report_creatives: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          report_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          report_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          report_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_report_creatives_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "traffic_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_report_simulations: {
        Row: {
          created_at: string
          current_investment: number
          id: string
          notes: string | null
          projected_clicks: number
          projected_leads: number
          projected_messages: number
          projected_reach: number
          report_id: string
          simulated_investment: number
        }
        Insert: {
          created_at?: string
          current_investment?: number
          id?: string
          notes?: string | null
          projected_clicks?: number
          projected_leads?: number
          projected_messages?: number
          projected_reach?: number
          report_id: string
          simulated_investment?: number
        }
        Update: {
          created_at?: string
          current_investment?: number
          id?: string
          notes?: string | null
          projected_clicks?: number
          projected_leads?: number
          projected_messages?: number
          projected_reach?: number
          report_id?: string
          simulated_investment?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_report_simulations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "traffic_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_report_snapshots: {
        Row: {
          campaign_name: string | null
          created_at: string
          file_name: string
          id: string
          metrics: Json
          period_end: string
          period_start: string
          report_id: string
          upload_label: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          file_name?: string
          id?: string
          metrics?: Json
          period_end: string
          period_start: string
          report_id: string
          upload_label?: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          file_name?: string
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          report_id?: string
          upload_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "traffic_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_reports: {
        Row: {
          access_password: string | null
          access_token: string
          allow_layout_switch: boolean
          allowed_layouts: Json | null
          client_company_name: string | null
          client_contact_name: string | null
          client_id: string | null
          client_logo_url: string | null
          contact_email: string | null
          contact_whatsapp: string | null
          created_at: string
          external_view_count: number
          goal_reference: number | null
          goal_target: number | null
          header_bg_color: string | null
          header_bg_gradient: string | null
          header_bg_image_url: string | null
          header_bg_type: string
          header_matrix_color: string | null
          header_matrix_enabled: boolean
          header_matrix_speed: number
          header_matrix_text: string | null
          header_padding: number | null
          id: string
          internal_view_count: number
          investment_tip: string | null
          last_external_viewed_at: string | null
          last_internal_viewed_at: string | null
          last_viewed_at: string | null
          layout_theme: number
          matrix_color: string | null
          matrix_duration: number | null
          matrix_effect: string | null
          matrix_enabled: boolean | null
          matrix_text: string | null
          period_end: string | null
          period_start: string | null
          slug: string | null
          status: string
          strategy_notes: string | null
          strategy_type: string | null
          title: string
          update_info_config: Json
          updated_at: string
          user_id: string
          view_count: number | null
          whatsapp_widget_config: Json | null
        }
        Insert: {
          access_password?: string | null
          access_token?: string
          allow_layout_switch?: boolean
          allowed_layouts?: Json | null
          client_company_name?: string | null
          client_contact_name?: string | null
          client_id?: string | null
          client_logo_url?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          external_view_count?: number
          goal_reference?: number | null
          goal_target?: number | null
          header_bg_color?: string | null
          header_bg_gradient?: string | null
          header_bg_image_url?: string | null
          header_bg_type?: string
          header_matrix_color?: string | null
          header_matrix_enabled?: boolean
          header_matrix_speed?: number
          header_matrix_text?: string | null
          header_padding?: number | null
          id?: string
          internal_view_count?: number
          investment_tip?: string | null
          last_external_viewed_at?: string | null
          last_internal_viewed_at?: string | null
          last_viewed_at?: string | null
          layout_theme?: number
          matrix_color?: string | null
          matrix_duration?: number | null
          matrix_effect?: string | null
          matrix_enabled?: boolean | null
          matrix_text?: string | null
          period_end?: string | null
          period_start?: string | null
          slug?: string | null
          status?: string
          strategy_notes?: string | null
          strategy_type?: string | null
          title?: string
          update_info_config?: Json
          updated_at?: string
          user_id: string
          view_count?: number | null
          whatsapp_widget_config?: Json | null
        }
        Update: {
          access_password?: string | null
          access_token?: string
          allow_layout_switch?: boolean
          allowed_layouts?: Json | null
          client_company_name?: string | null
          client_contact_name?: string | null
          client_id?: string | null
          client_logo_url?: string | null
          contact_email?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          external_view_count?: number
          goal_reference?: number | null
          goal_target?: number | null
          header_bg_color?: string | null
          header_bg_gradient?: string | null
          header_bg_image_url?: string | null
          header_bg_type?: string
          header_matrix_color?: string | null
          header_matrix_enabled?: boolean
          header_matrix_speed?: number
          header_matrix_text?: string | null
          header_padding?: number | null
          id?: string
          internal_view_count?: number
          investment_tip?: string | null
          last_external_viewed_at?: string | null
          last_internal_viewed_at?: string | null
          last_viewed_at?: string | null
          layout_theme?: number
          matrix_color?: string | null
          matrix_duration?: number | null
          matrix_effect?: string | null
          matrix_enabled?: boolean | null
          matrix_text?: string | null
          period_end?: string | null
          period_start?: string | null
          slug?: string | null
          status?: string
          strategy_notes?: string | null
          strategy_type?: string | null
          title?: string
          update_info_config?: Json
          updated_at?: string
          user_id?: string
          view_count?: number | null
          whatsapp_widget_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_simulations: {
        Row: {
          client_id: string | null
          config: Json
          created_at: string
          id: string
          quote_id: string | null
          recommendations: Json
          results: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          quote_id?: string | null
          recommendations?: Json
          results?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          config?: Json
          created_at?: string
          id?: string
          quote_id?: string | null
          recommendations?: Json
          results?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_simulations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string | null
          id: string
          page: string | null
          referrer: string | null
          slug: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page?: string | null
          referrer?: string | null
          slug?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page?: string | null
          referrer?: string | null
          slug?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          active: boolean
          catalog_id: string | null
          created_at: string
          endpoint_url: string
          events: Json
          id: string
          name: string
          plan_name: string | null
          platform: string
          product_ids: Json | null
          secret_key: string
          token: string | null
        }
        Insert: {
          active?: boolean
          catalog_id?: string | null
          created_at?: string
          endpoint_url?: string
          events?: Json
          id?: string
          name?: string
          plan_name?: string | null
          platform?: string
          product_ids?: Json | null
          secret_key?: string
          token?: string | null
        }
        Update: {
          active?: boolean
          catalog_id?: string | null
          created_at?: string
          endpoint_url?: string
          events?: Json
          id?: string
          name?: string
          plan_name?: string | null
          platform?: string
          product_ids?: Json | null
          secret_key?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          status: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          status?: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[] | null
          id: string
          name: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          id?: string
          name?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          id?: string
          name?: string | null
          url?: string
        }
        Relationships: []
      }
      widget_configs: {
        Row: {
          border_radius: number | null
          created_at: string
          cta_button_text: string | null
          custom_accent_color: string | null
          custom_bg_color: string | null
          custom_text_color: string | null
          description: string | null
          footer_text: string | null
          id: string
          is_active: boolean
          layout_template: number
          logo_url: string | null
          name: string
          require_client_name: boolean
          require_client_phone: boolean
          show_client_name: boolean
          show_client_phone: boolean
          slug: string
          submission_counter: number
          subtitle: string | null
          theme_id: string
          title: string | null
          updated_at: string
          user_id: string
          whatsapp_message_prefix: string | null
          whatsapp_number: string | null
        }
        Insert: {
          border_radius?: number | null
          created_at?: string
          cta_button_text?: string | null
          custom_accent_color?: string | null
          custom_bg_color?: string | null
          custom_text_color?: string | null
          description?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          layout_template?: number
          logo_url?: string | null
          name?: string
          require_client_name?: boolean
          require_client_phone?: boolean
          show_client_name?: boolean
          show_client_phone?: boolean
          slug?: string
          submission_counter?: number
          subtitle?: string | null
          theme_id?: string
          title?: string | null
          updated_at?: string
          user_id: string
          whatsapp_message_prefix?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          border_radius?: number | null
          created_at?: string
          cta_button_text?: string | null
          custom_accent_color?: string | null
          custom_bg_color?: string | null
          custom_text_color?: string | null
          description?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          layout_template?: number
          logo_url?: string | null
          name?: string
          require_client_name?: boolean
          require_client_phone?: boolean
          show_client_name?: boolean
          show_client_phone?: boolean
          slug?: string
          submission_counter?: number
          subtitle?: string | null
          theme_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_message_prefix?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      widget_items: {
        Row: {
          base_price: number
          catalog_id: string | null
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          price_type: string
          sort_order: number
          widget_id: string
        }
        Insert: {
          base_price?: number
          catalog_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_type?: string
          sort_order?: number
          widget_id: string
        }
        Update: {
          base_price?: number
          catalog_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_type?: string
          sort_order?: number
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_items_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_submissions: {
        Row: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          id: string
          ip_address: string | null
          selected_items: Json
          submission_number: number
          total_value: number
          whatsapp_sent: boolean
          widget_id: string
        }
        Insert: {
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          selected_items?: Json
          submission_number?: number
          total_value?: number
          whatsapp_sent?: boolean
          widget_id: string
        }
        Update: {
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          selected_items?: Json
          submission_number?: number
          total_value?: number
          whatsapp_sent?: boolean
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_submissions_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_admin_data: { Args: { _user_id: string }; Returns: boolean }
      can_manage_team_members: { Args: { _user_id: string }; Returns: boolean }
      contrato_assinatura_escolher_metodo: {
        Args: { _metodo: string; _token: string }
        Returns: Json
      }
      contrato_assinatura_get_by_token: {
        Args: { _token: string }
        Returns: Json
      }
      contrato_assinatura_registrar_cliente: {
        Args: {
          _assinatura: string
          _ip: string
          _token: string
          _user_agent: string
        }
        Returns: Json
      }
      create_team_member_profile_v4: {
        Args: {
          _can_create?: boolean
          _can_delete?: boolean
          _can_edit?: boolean
          _can_export?: boolean
          _can_manage_team?: boolean
          _display_name: string
          _email: string
          _role: string
          _sidebar_items: Json
          _tabs: Json
          _user_id: string
        }
        Returns: Json
      }
      create_team_member_profile_v7: {
        Args: {
          _can_create?: boolean
          _can_delete?: boolean
          _can_edit?: boolean
          _can_export?: boolean
          _can_manage_team?: boolean
          _display_name: string
          _email: string
          _role?: string
          _sidebar_items?: string[]
          _tabs?: string[]
          _user_id: string
        }
        Returns: Json
      }
      force_schema_reload: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quote_view: { Args: { quote_slug: string }; Returns: undefined }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      team_permissions_empty: { Args: never; Returns: boolean }
      track_page_view: {
        Args: {
          _device: string
          _target_slug: string
          _target_type: string
          _user_agent?: string
        }
        Returns: Json
      }
      update_traffic_snapshot_campaign: {
        Args: { _campaign_name: string; _snapshot_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      client_status:
        | "orcamento"
        | "negociacao"
        | "ativo"
        | "pausado"
        | "cancelado"
      metodo_pagamento_contrato: "cartao" | "pix"
      status_assinatura_remota:
        | "aguardando_vendedor"
        | "aguardando_cliente"
        | "assinado"
        | "pagamento_escolhido"
        | "concluido"
        | "expirado"
        | "cancelado"
      status_contrato_servico: "rascunho" | "ativo" | "encerrado" | "cancelado"
      tipo_servico_contrato:
        | "trafego"
        | "sites"
        | "loja_virtual"
        | "sistemas_app"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      client_status: [
        "orcamento",
        "negociacao",
        "ativo",
        "pausado",
        "cancelado",
      ],
      metodo_pagamento_contrato: ["cartao", "pix"],
      status_assinatura_remota: [
        "aguardando_vendedor",
        "aguardando_cliente",
        "assinado",
        "pagamento_escolhido",
        "concluido",
        "expirado",
        "cancelado",
      ],
      status_contrato_servico: ["rascunho", "ativo", "encerrado", "cancelado"],
      tipo_servico_contrato: [
        "trafego",
        "sites",
        "loja_virtual",
        "sistemas_app",
      ],
    },
  },
} as const
