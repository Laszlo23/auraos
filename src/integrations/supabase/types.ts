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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          agent_id: string | null
          company_id: string
          created_at: string
          id: string
          kind: string
          message: string
          value: number | null
        }
        Insert: {
          agent_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          kind?: string
          message: string
          value?: number | null
        }
        Update: {
          agent_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          message?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_hires: {
        Row: {
          agent_id: string | null
          created_at: string
          hirer_company_id: string
          id: string
          listing_id: string
          price_aura: number
          royalty_aura: number
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          hirer_company_id: string
          id?: string
          listing_id: string
          price_aura?: number
          royalty_aura?: number
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          hirer_company_id?: string
          id?: string
          listing_id?: string
          price_aura?: number
          royalty_aura?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_hires_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_hires_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_hires_hirer_company_id_fkey"
            columns: ["hirer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_hires_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "agent_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_listings: {
        Row: {
          category: string
          companies_using: number
          created_at: string
          creator_company_id: string
          creator_user_id: string
          id: string
          instructions: string
          name: string
          price_aura: number
          price_usdc: number
          pricing_model: string
          rating: number
          revenue_aura: number
          role: string
          royalty_bps: number
          skills: string[]
          status: string
          success_rate: number
          summary: string
          tasks_completed: number
          updated_at: string
        }
        Insert: {
          category?: string
          companies_using?: number
          created_at?: string
          creator_company_id: string
          creator_user_id: string
          id?: string
          instructions?: string
          name: string
          price_aura?: number
          price_usdc?: number
          pricing_model?: string
          rating?: number
          revenue_aura?: number
          role: string
          royalty_bps?: number
          skills?: string[]
          status?: string
          success_rate?: number
          summary: string
          tasks_completed?: number
          updated_at?: string
        }
        Update: {
          category?: string
          companies_using?: number
          created_at?: string
          creator_company_id?: string
          creator_user_id?: string
          id?: string
          instructions?: string
          name?: string
          price_aura?: number
          price_usdc?: number
          pricing_model?: string
          rating?: number
          revenue_aura?: number
          role?: string
          royalty_bps?: number
          skills?: string[]
          status?: string
          success_rate?: number
          summary?: string
          tasks_completed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_listings_creator_company_id_fkey"
            columns: ["creator_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_session_keys: {
        Row: {
          agent_id: string | null
          allowed_actions: string[]
          company_id: string
          created_at: string
          derivation_slot: number | null
          expires_at: string | null
          id: string
          key_address: string
          key_material_enc: string | null
          label: string | null
          spend_cap: number
          spent: number
          status: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          agent_id?: string | null
          allowed_actions?: string[]
          company_id: string
          created_at?: string
          derivation_slot?: number | null
          expires_at?: string | null
          id?: string
          key_address: string
          key_material_enc?: string | null
          label?: string | null
          spend_cap?: number
          spent?: number
          status?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          agent_id?: string | null
          allowed_actions?: string[]
          company_id?: string
          created_at?: string
          derivation_slot?: number | null
          expires_at?: string | null
          id?: string
          key_address?: string
          key_material_enc?: string | null
          label?: string | null
          spend_cap?: number
          spent?: number
          status?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_session_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_session_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_session_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_session_keys_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "public_handle_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_session_keys_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          accent: string
          activity: number
          avatar: string
          company_id: string
          created_at: string
          credits_used: number
          current_task: string | null
          daily_budget_aura: number
          health: number
          id: string
          lessons_count: number
          memory: string | null
          name: string
          paused: boolean
          performance: number
          revenue_generated: number
          role: string
          status: string
          tasks_completed: number
        }
        Insert: {
          accent?: string
          activity?: number
          avatar?: string
          company_id: string
          created_at?: string
          credits_used?: number
          current_task?: string | null
          daily_budget_aura?: number
          health?: number
          id?: string
          lessons_count?: number
          memory?: string | null
          name: string
          paused?: boolean
          performance?: number
          revenue_generated?: number
          role: string
          status?: string
          tasks_completed?: number
        }
        Update: {
          accent?: string
          activity?: number
          avatar?: string
          company_id?: string
          created_at?: string
          credits_used?: number
          current_task?: string | null
          daily_budget_aura?: number
          health?: number
          id?: string
          lessons_count?: number
          memory?: string | null
          name?: string
          paused?: boolean
          performance?: number
          revenue_generated?: number
          role?: string
          status?: string
          tasks_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      akquise_campaigns: {
        Row: {
          agents_labeled: string[]
          artifact: Json
          aura_spent: number
          brief: string
          company_id: string
          completed_at: string | null
          created_at: string
          goal: string | null
          id: string
          language: string
          mission_id: string | null
          name: string
          objective: string
          plan: Json
          region: string | null
          seed_urls: string[]
          share_public: boolean
          share_slug: string | null
          started_at: string | null
          status: string
          steps: Json
          target_count: number
          template: string
          tone: string
          verify: Json
        }
        Insert: {
          agents_labeled?: string[]
          artifact?: Json
          aura_spent?: number
          brief: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          mission_id?: string | null
          name: string
          objective?: string
          plan?: Json
          region?: string | null
          seed_urls?: string[]
          share_public?: boolean
          share_slug?: string | null
          started_at?: string | null
          status?: string
          steps?: Json
          target_count?: number
          template?: string
          tone?: string
          verify?: Json
        }
        Update: {
          agents_labeled?: string[]
          artifact?: Json
          aura_spent?: number
          brief?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          mission_id?: string | null
          name?: string
          objective?: string
          plan?: Json
          region?: string | null
          seed_urls?: string[]
          share_public?: boolean
          share_slug?: string | null
          started_at?: string | null
          status?: string
          steps?: Json
          target_count?: number
          template?: string
          tone?: string
          verify?: Json
        }
        Relationships: [
          {
            foreignKeyName: "akquise_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akquise_campaigns_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "revenue_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      akquise_leads: {
        Row: {
          address: string | null
          campaign_id: string
          company_id: string
          created_at: string
          draft_body: string | null
          draft_subject: string | null
          email: string | null
          id: string
          metadata: Json
          name: string | null
          org: string | null
          phone: string | null
          score: number
          sent_at: string | null
          snippet: string | null
          source_url: string | null
          status: string
        }
        Insert: {
          address?: string | null
          campaign_id: string
          company_id: string
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          org?: string | null
          phone?: string | null
          score?: number
          sent_at?: string | null
          snippet?: string | null
          source_url?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          campaign_id?: string
          company_id?: string
          created_at?: string
          draft_body?: string | null
          draft_subject?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          org?: string | null
          phone?: string | null
          score?: number
          sent_at?: string | null
          snippet?: string | null
          source_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "akquise_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "akquise_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akquise_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_events: {
        Row: {
          company_id: string | null
          created_at: string
          event: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event?: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          account_label: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          nodes: Json
          runs: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          nodes?: Json
          runs?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          nodes?: Json
          runs?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          id: string
          name: string
          progress: number
          roas: number
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          channel?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          progress?: number
          roas?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          progress?: number
          roas?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_completions: {
        Row: {
          challenge_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          challenge_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          challenge_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "contest_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_completions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_connections: {
        Row: {
          access_token_ciphertext: string | null
          agent_name: string | null
          auto_publish: boolean
          company_id: string
          created_at: string
          engagement: number
          external_user_id: string | null
          followers: number
          handle: string | null
          id: string
          ig_user_id: string | null
          last_sync: string | null
          meta_page_id: string | null
          meta_page_name: string | null
          provider: string
          reach: number
          refresh_token_ciphertext: string | null
          reply_mode: string
          scopes: string | null
          status: string
          token_expires_at: string | null
        }
        Insert: {
          access_token_ciphertext?: string | null
          agent_name?: string | null
          auto_publish?: boolean
          company_id: string
          created_at?: string
          engagement?: number
          external_user_id?: string | null
          followers?: number
          handle?: string | null
          id?: string
          ig_user_id?: string | null
          last_sync?: string | null
          meta_page_id?: string | null
          meta_page_name?: string | null
          provider: string
          reach?: number
          refresh_token_ciphertext?: string | null
          reply_mode?: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Update: {
          access_token_ciphertext?: string | null
          agent_name?: string | null
          auto_publish?: boolean
          company_id?: string
          created_at?: string
          engagement?: number
          external_user_id?: string | null
          followers?: number
          handle?: string | null
          id?: string
          ig_user_id?: string | null
          last_sync?: string | null
          meta_page_id?: string | null
          meta_page_name?: string | null
          provider?: string
          reach?: number
          refresh_token_ciphertext?: string | null
          reply_mode?: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_engagements: {
        Row: {
          author_handle: string | null
          author_name: string | null
          body: string
          company_id: string
          connection_id: string
          created_at: string
          external_id: string
          external_reply_id: string | null
          id: string
          kind: string
          post_id: string | null
          provider: string
          replied_at: string | null
          reply_body: string | null
          status: string
        }
        Insert: {
          author_handle?: string | null
          author_name?: string | null
          body: string
          company_id: string
          connection_id: string
          created_at?: string
          external_id: string
          external_reply_id?: string | null
          id?: string
          kind?: string
          post_id?: string | null
          provider: string
          replied_at?: string | null
          reply_body?: string | null
          status?: string
        }
        Update: {
          author_handle?: string | null
          author_name?: string | null
          body?: string
          company_id?: string
          connection_id?: string
          created_at?: string
          external_id?: string
          external_reply_id?: string | null
          id?: string
          kind?: string
          post_id?: string | null
          provider?: string
          replied_at?: string | null
          reply_body?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_engagements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_engagements_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_engagements_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          agent_name: string | null
          body: string
          campaign_key: string | null
          company_id: string
          created_at: string
          error: string | null
          external_post_id: string | null
          external_url: string | null
          id: string
          impressions: number
          likes: number
          provider: string
          published_at: string | null
          reply_to_external_id: string | null
          reposts: number
          scheduled_at: string | null
          status: string
        }
        Insert: {
          agent_name?: string | null
          body: string
          campaign_key?: string | null
          company_id: string
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          impressions?: number
          likes?: number
          provider: string
          published_at?: string | null
          reply_to_external_id?: string | null
          reposts?: number
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          agent_name?: string | null
          body?: string
          campaign_key?: string | null
          company_id?: string
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          external_url?: string | null
          id?: string
          impressions?: number
          likes?: number
          provider?: string
          published_at?: string | null
          reply_to_external_id?: string | null
          reposts?: number
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_name: string
          author_role: string | null
          avatar: string | null
          body: string
          company_id: string
          created_at: string
          id: string
          likes: number
          pinned: boolean
          replies: number
          topic: string
        }
        Insert: {
          author_name: string
          author_role?: string | null
          avatar?: string | null
          body: string
          company_id: string
          created_at?: string
          id?: string
          likes?: number
          pinned?: boolean
          replies?: number
          topic?: string
        }
        Update: {
          author_name?: string
          author_role?: string | null
          avatar?: string | null
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          likes?: number
          pinned?: boolean
          replies?: number
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          allowed_symbols: string[]
          autonomy: number
          created_at: string
          credits: number
          daily_aura_budget: number
          emoji: string
          id: string
          max_notional_usdc_day: number
          max_risk_pct: number
          max_slippage_bps: number
          mrr: number
          name: string
          owner_id: string
          quant_boost_pct: number
          quant_boost_until: string | null
          reputation: number
          runway_days: number
          slug: string | null
          strategy: string | null
          tagline: string | null
          theme: string
          trading_armed: boolean
          trading_paper: boolean
        }
        Insert: {
          allowed_symbols?: string[]
          autonomy?: number
          created_at?: string
          credits?: number
          daily_aura_budget?: number
          emoji?: string
          id?: string
          max_notional_usdc_day?: number
          max_risk_pct?: number
          max_slippage_bps?: number
          mrr?: number
          name: string
          owner_id: string
          quant_boost_pct?: number
          quant_boost_until?: string | null
          reputation?: number
          runway_days?: number
          slug?: string | null
          strategy?: string | null
          tagline?: string | null
          theme?: string
          trading_armed?: boolean
          trading_paper?: boolean
        }
        Update: {
          allowed_symbols?: string[]
          autonomy?: number
          created_at?: string
          credits?: number
          daily_aura_budget?: number
          emoji?: string
          id?: string
          max_notional_usdc_day?: number
          max_risk_pct?: number
          max_slippage_bps?: number
          mrr?: number
          name?: string
          owner_id?: string
          quant_boost_pct?: number
          quant_boost_until?: string | null
          reputation?: number
          runway_days?: number
          slug?: string | null
          strategy?: string | null
          tagline?: string | null
          theme?: string
          trading_armed?: boolean
          trading_paper?: boolean
        }
        Relationships: []
      }
      company_ledger_entries: {
        Row: {
          agent_id: string | null
          amount_aura: number
          amount_usdc: number
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          kind: string
          metadata: Json
          source: string
          source_id: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          amount_aura?: number
          amount_usdc?: number
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json
          source?: string
          source_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          amount_aura?: number
          amount_usdc?: number
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json
          source?: string
          source_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ledger_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_ledger_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_ledger_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_challenges: {
        Row: {
          brief: string | null
          code: string
          id: string
          points: number
          season_id: string
          sort_order: number
          title: string
          token_reward: number
          xp_reward: number
        }
        Insert: {
          brief?: string | null
          code: string
          id?: string
          points?: number
          season_id: string
          sort_order?: number
          title: string
          token_reward?: number
          xp_reward?: number
        }
        Update: {
          brief?: string | null
          code?: string
          id?: string
          points?: number
          season_id?: string
          sort_order?: number
          title?: string
          token_reward?: number
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "contest_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_entries: {
        Row: {
          build_score: number
          community_score: number
          company_id: string
          created_at: string
          handle_id: string | null
          id: string
          momentum_score: number
          pitch: string | null
          revenue_score: number
          season_id: string
          staked_total: number
          total_score: number
          updated_at: string
        }
        Insert: {
          build_score?: number
          community_score?: number
          company_id: string
          created_at?: string
          handle_id?: string | null
          id?: string
          momentum_score?: number
          pitch?: string | null
          revenue_score?: number
          season_id: string
          staked_total?: number
          total_score?: number
          updated_at?: string
        }
        Update: {
          build_score?: number
          community_score?: number
          company_id?: string
          created_at?: string
          handle_id?: string | null
          id?: string
          momentum_score?: number
          pitch?: string | null
          revenue_score?: number
          season_id?: string
          staked_total?: number
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "contest_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          prize_pool: number
          rules: string | null
          slug: string
          starts_at: string
          status: string
          theme: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          name: string
          prize_pool?: number
          rules?: string | null
          slug: string
          starts_at?: string
          status?: string
          theme?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          prize_pool?: number
          rules?: string | null
          slug?: string
          starts_at?: string
          status?: string
          theme?: string | null
        }
        Relationships: []
      }
      contest_stakes: {
        Row: {
          amount: number
          backer_id: string
          created_at: string
          entry_id: string
          id: string
          season_id: string
        }
        Insert: {
          amount: number
          backer_id: string
          created_at?: string
          entry_id: string
          id?: string
          season_id: string
        }
        Update: {
          amount?: number
          backer_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_stakes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_stakes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "contest_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_id: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          last_seen: string | null
          ltv: number
          name: string
          plan: string | null
          status: string
        }
        Insert: {
          company_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen?: string | null
          ltv?: number
          name: string
          plan?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen?: string | null
          ltv?: number
          name?: string
          plan?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company_id: string
          contact: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          sort_order: number
          stage: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          company_id: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          sort_order?: number
          stage?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          company_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          sort_order?: number
          stage?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_ledger: {
        Row: {
          amount: number
          claimed_at: string | null
          company_id: string | null
          created_at: string
          id: string
          kind: string
          reason: string
          referral_id: string | null
          status: string
          tx_hash: string | null
          user_id: string
          xp: number
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind: string
          reason: string
          referral_id?: string | null
          status?: string
          tx_hash?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          reason?: string
          referral_id?: string | null
          status?: string
          tx_hash?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "earnings_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_ledger_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          company_id: string
          created_at: string
          folder: string
          id: string
          kind: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          size_kb: number
          storage_path: string | null
          summary: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          folder?: string
          id?: string
          kind?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          size_kb?: number
          storage_path?: string | null
          summary?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          folder?: string
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          size_kb?: number
          storage_path?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fio_attestations: {
        Row: {
          attested_at: string | null
          chain_code: string
          created_at: string
          fio_handle: string
          handle_id: string
          id: string
          last_checked_at: string | null
          previous_address: string | null
          resolved_address: string | null
          status: string
          token_code: string
          user_id: string
          verified: boolean
          wallet_id: string | null
        }
        Insert: {
          attested_at?: string | null
          chain_code?: string
          created_at?: string
          fio_handle: string
          handle_id: string
          id?: string
          last_checked_at?: string | null
          previous_address?: string | null
          resolved_address?: string | null
          status?: string
          token_code?: string
          user_id: string
          verified?: boolean
          wallet_id?: string | null
        }
        Update: {
          attested_at?: string | null
          chain_code?: string
          created_at?: string
          fio_handle?: string
          handle_id?: string
          id?: string
          last_checked_at?: string | null
          previous_address?: string | null
          resolved_address?: string | null
          status?: string
          token_code?: string
          user_id?: string
          verified?: boolean
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fio_attestations_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fio_attestations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "public_handle_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fio_attestations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_progress: {
        Row: {
          company_id: string
          completed_quests: string[]
          created_at: string
          id: string
          last_active: string
          level: number
          onboarded: boolean
          seat_number: number
          streak_days: number
          xp: number
        }
        Insert: {
          company_id: string
          completed_quests?: string[]
          created_at?: string
          id?: string
          last_active?: string
          level?: number
          onboarded?: boolean
          seat_number?: number
          streak_days?: number
          xp?: number
        }
        Update: {
          company_id?: string
          completed_quests?: string[]
          created_at?: string
          id?: string
          last_active?: string
          level?: number
          onboarded?: boolean
          seat_number?: number
          streak_days?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "founder_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      handles: {
        Row: {
          avatar: string
          bio: string | null
          company_id: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          is_public: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string
          bio?: string | null
          company_id?: string | null
          created_at?: string
          display_name: string
          handle: string
          id?: string
          is_public?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string
          bio?: string | null
          company_id?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          is_public?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          impact: string | null
          kind: string
          title: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          impact?: string | null
          kind?: string
          title: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          impact?: string | null
          kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          label: string | null
          max_uses: number
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          label?: string | null
          max_uses?: number
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          label?: string | null
          max_uses?: number
          uses?: number
        }
        Relationships: []
      }
      invite_redemptions: {
        Row: {
          code: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          cluster: string
          company_id: string
          created_at: string
          id: string
          source: string | null
          summary: string | null
          title: string
        }
        Insert: {
          cluster?: string
          company_id: string
          created_at?: string
          id?: string
          source?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          cluster?: string
          company_id?: string
          created_at?: string
          id?: string
          source?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_installs: {
        Row: {
          company_id: string
          created_at: string
          id: string
          slug: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          slug: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_installs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          company_id: string
          conversion: number
          day: string
          id: string
          revenue: number
          tasks_completed: number
          visitors: number
        }
        Insert: {
          company_id: string
          conversion?: number
          day: string
          id?: string
          revenue?: number
          tasks_completed?: number
          visitors?: number
        }
        Update: {
          company_id?: string
          conversion?: number
          day?: string
          id?: string
          revenue?: number
          tasks_completed?: number
          visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_cheers: {
        Row: {
          created_at: string
          id: string
          milestone_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_cheers_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          body: string | null
          cheers: number
          company_id: string
          created_at: string
          handle_id: string | null
          id: string
          kind: string
          metric: string | null
          season_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          cheers?: number
          company_id: string
          created_at?: string
          handle_id?: string | null
          id?: string
          kind?: string
          metric?: string | null
          season_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          cheers?: number
          company_id?: string
          created_at?: string
          handle_id?: string | null
          id?: string
          kind?: string
          metric?: string | null
          season_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "contest_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          company_id: string
          conversion: number
          created_at: string
          description: string | null
          emoji: string
          id: string
          inventory: number
          name: string
          price: number
          revenue: number
          subscriptions: number
        }
        Insert: {
          company_id: string
          conversion?: number
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          inventory?: number
          name: string
          price?: number
          revenue?: number
          subscriptions?: number
        }
        Update: {
          company_id?: string
          conversion?: number
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          inventory?: number
          name?: string
          price?: number
          revenue?: number
          subscriptions?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          handle_id: string | null
          id: string
          user_id: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          handle_id?: string | null
          id?: string
          user_id: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          handle_id?: string | null
          id?: string
          user_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated_at: string | null
          code: string
          created_at: string
          id: string
          referred_email: string | null
          referred_id: string | null
          referrer_id: string
          stage: string
          subscribed_at: string | null
        }
        Insert: {
          activated_at?: string | null
          code: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id: string
          stage?: string
          subscribed_at?: string | null
        }
        Update: {
          activated_at?: string | null
          code?: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id?: string
          stage?: string
          subscribed_at?: string | null
        }
        Relationships: []
      }
      revenue_mission_events: {
        Row: {
          agent_name: string
          company_id: string
          cost_aura: number
          cost_usdc: number
          created_at: string
          id: string
          kind: string
          message: string
          mission_id: string
          result: string | null
          status: string
        }
        Insert: {
          agent_name?: string
          company_id: string
          cost_aura?: number
          cost_usdc?: number
          created_at?: string
          id?: string
          kind?: string
          message: string
          mission_id: string
          result?: string | null
          status?: string
        }
        Update: {
          agent_name?: string
          company_id?: string
          cost_aura?: number
          cost_usdc?: number
          created_at?: string
          id?: string
          kind?: string
          message?: string
          mission_id?: string
          result?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_mission_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_mission_events_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "revenue_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_missions: {
        Row: {
          agents_status: Json
          akquise_campaign_id: string | null
          budget_usdc: number
          company_id: string
          completed_at: string | null
          created_at: string
          deadline_at: string | null
          goal_text: string
          id: string
          industry: string | null
          interventions: number
          location: string | null
          mission_number: number
          next_best_action: Json
          plan: Json
          projected: Json
          risk: string
          share_public: boolean
          share_slug: string | null
          started_at: string | null
          status: string
          target_usdc: number
          updated_at: string
        }
        Insert: {
          agents_status?: Json
          akquise_campaign_id?: string | null
          budget_usdc?: number
          company_id: string
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          goal_text: string
          id?: string
          industry?: string | null
          interventions?: number
          location?: string | null
          mission_number?: number
          next_best_action?: Json
          plan?: Json
          projected?: Json
          risk?: string
          share_public?: boolean
          share_slug?: string | null
          started_at?: string | null
          status?: string
          target_usdc?: number
          updated_at?: string
        }
        Update: {
          agents_status?: Json
          akquise_campaign_id?: string | null
          budget_usdc?: number
          company_id?: string
          completed_at?: string | null
          created_at?: string
          deadline_at?: string | null
          goal_text?: string
          id?: string
          industry?: string | null
          interventions?: number
          location?: string | null
          mission_number?: number
          next_best_action?: Json
          plan?: Json
          projected?: Json
          risk?: string
          share_public?: boolean
          share_slug?: string | null
          started_at?: string | null
          status?: string
          target_usdc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_missions_akquise_campaign_id_fkey"
            columns: ["akquise_campaign_id"]
            isOneToOne: false
            referencedRelation: "akquise_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_money_events: {
        Row: {
          amount: number
          amount_usd: number | null
          asset: string
          block_num: number | null
          company_id: string | null
          counterparty: string | null
          created_at: string
          direction: string
          id: string
          summary: string | null
          tx_hash: string | null
          wallet_address: string
          wallet_id: string | null
        }
        Insert: {
          amount?: number
          amount_usd?: number | null
          asset: string
          block_num?: number | null
          company_id?: string | null
          counterparty?: string | null
          created_at?: string
          direction: string
          id?: string
          summary?: string | null
          tx_hash?: string | null
          wallet_address: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number | null
          asset?: string
          block_num?: number | null
          company_id?: string | null
          counterparty?: string | null
          created_at?: string
          direction?: string
          id?: string
          summary?: string | null
          tx_hash?: string | null
          wallet_address?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_money_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_money_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "smart_money_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_money_wallets: {
        Row: {
          address: string
          company_id: string | null
          created_at: string
          curated: boolean
          follow: boolean
          id: string
          label: string
          tags: string[]
        }
        Insert: {
          address: string
          company_id?: string | null
          created_at?: string
          curated?: boolean
          follow?: boolean
          id?: string
          label: string
          tags?: string[]
        }
        Update: {
          address?: string
          company_id?: string | null
          created_at?: string
          curated?: boolean
          follow?: boolean
          id?: string
          label?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "smart_money_wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_oauth_states: {
        Row: {
          code_verifier: string
          company_id: string
          created_at: string
          popup: boolean
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          company_id: string
          created_at?: string
          popup?: boolean
          provider: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          company_id?: string
          created_at?: string
          popup?: boolean
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_oauth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          company_id: string
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          payment_mode: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tokens_per_cycle: number
          tokens_remaining: number
          tx_hash: string | null
          wallet_address: string | null
        }
        Insert: {
          auto_renew?: boolean
          company_id: string
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          payment_mode?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tokens_per_cycle?: number
          tokens_remaining?: number
          tx_hash?: string | null
          wallet_address?: string | null
        }
        Update: {
          auto_renew?: boolean
          company_id?: string
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          payment_mode?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tokens_per_cycle?: number
          tokens_remaining?: number
          tx_hash?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_id: string | null
          artifact: Json
          company_id: string
          completed_at: string | null
          created_at: string
          depends_on: string | null
          description: string | null
          due_at: string | null
          id: string
          mission_id: string | null
          priority: string
          progress: number
          result: string | null
          roi: number
          started_at: string | null
          status: string
          steps: Json
          title: string
        }
        Insert: {
          agent_id?: string | null
          artifact?: Json
          company_id: string
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          mission_id?: string | null
          priority?: string
          progress?: number
          result?: string | null
          roi?: number
          started_at?: string | null
          status?: string
          steps?: Json
          title: string
        }
        Update: {
          agent_id?: string | null
          artifact?: Json
          company_id?: string
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          mission_id?: string | null
          priority?: string
          progress?: number
          result?: string | null
          roi?: number
          started_at?: string | null
          status?: string
          steps?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "revenue_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      teaser_events: {
        Row: {
          created_at: string
          event: string
          id: string
          landing_path: string | null
          placement: string
          position_pct: number | null
          ref_code: string | null
          referrer: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          landing_path?: string | null
          placement?: string
          position_pct?: number | null
          ref_code?: string | null
          referrer?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          landing_path?: string | null
          placement?: string
          position_pct?: number | null
          ref_code?: string | null
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
      token_ledger: {
        Row: {
          agent_id: string | null
          amount: number
          company_id: string
          created_at: string
          id: string
          kind: string
          reason: string
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          kind?: string
          reason: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_ledger_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_ledger_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          amount_in: number | null
          amount_out: number | null
          chain_id: number | null
          closed_at: string | null
          company_id: string
          confidence: number
          created_at: string
          entry: number
          exit: number | null
          id: string
          mark_price: number | null
          opened_at: string
          paper: boolean
          pnl: number
          rationale: string | null
          side: string
          signal_id: string | null
          size: number
          status: string
          strategy_id: string | null
          symbol: string
          token_in: string | null
          token_out: string | null
          tx_hash: string | null
        }
        Insert: {
          amount_in?: number | null
          amount_out?: number | null
          chain_id?: number | null
          closed_at?: string | null
          company_id: string
          confidence?: number
          created_at?: string
          entry?: number
          exit?: number | null
          id?: string
          mark_price?: number | null
          opened_at?: string
          paper?: boolean
          pnl?: number
          rationale?: string | null
          side?: string
          signal_id?: string | null
          size?: number
          status?: string
          strategy_id?: string | null
          symbol: string
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
        }
        Update: {
          amount_in?: number | null
          amount_out?: number | null
          chain_id?: number | null
          closed_at?: string | null
          company_id?: string
          confidence?: number
          created_at?: string
          entry?: number
          exit?: number | null
          id?: string
          mark_price?: number | null
          opened_at?: string
          paper?: boolean
          pnl?: number
          rationale?: string | null
          side?: string
          signal_id?: string | null
          size?: number
          status?: string
          strategy_id?: string | null
          symbol?: string
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_backtest_shares: {
        Row: {
          company_id: string
          created_at: string
          id: string
          payload: Json
          share_slug: string
          strategy_id: string | null
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          share_slug: string
          strategy_id?: string | null
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          share_slug?: string
          strategy_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_backtest_shares_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_backtest_shares_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_orders: {
        Row: {
          amount_in: string | null
          amount_out: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          error: string | null
          id: string
          quote_snapshot: Json | null
          side: string
          signal_id: string | null
          slippage_bps: number | null
          status: string
          strategy_id: string | null
          symbol: string
          token_in: string | null
          token_out: string | null
          tx_hash: string | null
          user_op_hash: string | null
        }
        Insert: {
          amount_in?: string | null
          amount_out?: string | null
          company_id: string
          confirmed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          quote_snapshot?: Json | null
          side: string
          signal_id?: string | null
          slippage_bps?: number | null
          status?: string
          strategy_id?: string | null
          symbol: string
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
          user_op_hash?: string | null
        }
        Update: {
          amount_in?: string | null
          amount_out?: string | null
          company_id?: string
          confirmed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          quote_snapshot?: Json | null
          side?: string
          signal_id?: string | null
          slippage_bps?: number | null
          status?: string
          strategy_id?: string | null
          symbol?: string
          token_in?: string | null
          token_out?: string | null
          tx_hash?: string | null
          user_op_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_orders_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_orders_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_season_entries: {
        Row: {
          company_id: string
          company_name: string | null
          id: string
          max_drawdown_pct: number
          open_pnl: number
          rank: number | null
          realized_pnl: number
          score: number
          season_id: string
          trade_count: number
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name?: string | null
          id?: string
          max_drawdown_pct?: number
          open_pnl?: number
          rank?: number | null
          realized_pnl?: number
          score?: number
          season_id: string
          trade_count?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string | null
          id?: string
          max_drawdown_pct?: number
          open_pnl?: number
          rank?: number | null
          realized_pnl?: number
          score?: number
          season_id?: string
          trade_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_season_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_season_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "trading_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          prize_pool_aura: number
          slug: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          name: string
          prize_pool_aura?: number
          slug: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          prize_pool_aura?: number
          slug?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          company_id: string
          confidence: number
          created_at: string
          entry_price: number | null
          expires_at: string | null
          id: string
          mark_price: number | null
          metadata: Json
          notional_usdc: number
          rationale: string | null
          side: string
          source: string
          status: string
          strategy_id: string | null
          symbol: string
        }
        Insert: {
          company_id: string
          confidence?: number
          created_at?: string
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          mark_price?: number | null
          metadata?: Json
          notional_usdc?: number
          rationale?: string | null
          side: string
          source?: string
          status?: string
          strategy_id?: string | null
          symbol: string
        }
        Update: {
          company_id?: string
          confidence?: number
          created_at?: string
          entry_price?: number | null
          expires_at?: string | null
          id?: string
          mark_price?: number | null
          metadata?: Json
          notional_usdc?: number
          rationale?: string | null
          side?: string
          source?: string
          status?: string
          strategy_id?: string | null
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_signals_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_strategies: {
        Row: {
          agent_id: string | null
          backtest: Json | null
          company_id: string
          created_at: string
          id: string
          name: string
          prompt: string
          spec: Json
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          backtest?: Json | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          prompt: string
          spec?: Json
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          backtest?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          prompt?: string
          spec?: Json
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_strategies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_strategies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_strategies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      wallet_bindings: {
        Row: {
          address: string
          chain: string
          created_at: string
          custody: string
          deployed: boolean
          handle_id: string
          id: string
          kind: string
          label: string | null
          legacy: boolean
          owner_address: string | null
          owner_key_enc: string | null
          provider: string | null
          role: string
          slot: number
          user_id: string
          verified: boolean
          verified_at: string | null
          verify_nonce: string | null
        }
        Insert: {
          address: string
          chain?: string
          created_at?: string
          custody?: string
          deployed?: boolean
          handle_id: string
          id?: string
          kind?: string
          label?: string | null
          legacy?: boolean
          owner_address?: string | null
          owner_key_enc?: string | null
          provider?: string | null
          role?: string
          slot: number
          user_id: string
          verified?: boolean
          verified_at?: string | null
          verify_nonce?: string | null
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          custody?: string
          deployed?: boolean
          handle_id?: string
          id?: string
          kind?: string
          label?: string | null
          legacy?: boolean
          owner_address?: string | null
          owner_key_enc?: string | null
          provider?: string | null
          role?: string
          slot?: number
          user_id?: string
          verified?: boolean
          verified_at?: string | null
          verify_nonce?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_bindings_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          company_id: string
          created_at: string
          id: string
          share_public: boolean
          share_slug: string | null
          snapshot: Json
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          share_public?: boolean
          share_slug?: string | null
          snapshot?: Json
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          share_public?: boolean
          share_slug?: string | null
          snapshot?: Json
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_spins: {
        Row: {
          amount: number
          chain_network: string | null
          chain_status: string
          company_id: string
          created_at: string
          id: string
          label: string
          prize_kind: string
          rare: boolean
          settled_at: string | null
          spun_on: string
          tx_hash: string | null
          xp_awarded: number
        }
        Insert: {
          amount?: number
          chain_network?: string | null
          chain_status?: string
          company_id: string
          created_at?: string
          id?: string
          label: string
          prize_kind: string
          rare?: boolean
          settled_at?: string | null
          spun_on?: string
          tx_hash?: string | null
          xp_awarded?: number
        }
        Update: {
          amount?: number
          chain_network?: string | null
          chain_status?: string
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          prize_kind?: string
          rare?: boolean
          settled_at?: string | null
          spun_on?: string
          tx_hash?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_progress: {
        Row: {
          chat_channel: string | null
          comment_post: boolean
          completed_at: string | null
          created_at: string
          email: string
          follow_farcaster: boolean
          follow_x: boolean
          id: string
          invite_code: string | null
          like_post: boolean
          share_post: boolean
          updated_at: string
          visitor_id: string
          visits: Json
        }
        Insert: {
          chat_channel?: string | null
          comment_post?: boolean
          completed_at?: string | null
          created_at?: string
          email: string
          follow_farcaster?: boolean
          follow_x?: boolean
          id?: string
          invite_code?: string | null
          like_post?: boolean
          share_post?: boolean
          updated_at?: string
          visitor_id: string
          visits?: Json
        }
        Update: {
          chat_channel?: string | null
          comment_post?: boolean
          completed_at?: string | null
          created_at?: string
          email?: string
          follow_farcaster?: boolean
          follow_x?: boolean
          id?: string
          invite_code?: string | null
          like_post?: boolean
          share_post?: boolean
          updated_at?: string
          visitor_id?: string
          visits?: Json
        }
        Relationships: []
      }
      work_jobs: {
        Row: {
          accepted_company_id: string | null
          brief: string
          budget_usdc: number
          category: string
          compute_estimate_usdc: number
          created_at: string
          deadline_at: string | null
          id: string
          platform_fee_bps: number
          poster_company_id: string | null
          poster_label: string
          result_summary: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_company_id?: string | null
          brief: string
          budget_usdc?: number
          category?: string
          compute_estimate_usdc?: number
          created_at?: string
          deadline_at?: string | null
          id?: string
          platform_fee_bps?: number
          poster_company_id?: string | null
          poster_label?: string
          result_summary?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_company_id?: string | null
          brief?: string
          budget_usdc?: number
          category?: string
          compute_estimate_usdc?: number
          created_at?: string
          deadline_at?: string | null
          id?: string
          platform_fee_bps?: number
          poster_company_id?: string | null
          poster_label?: string
          result_summary?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_jobs_accepted_company_id_fkey"
            columns: ["accepted_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_jobs_poster_company_id_fkey"
            columns: ["poster_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      x402_calls: {
        Row: {
          agent_id: string | null
          amount_usdc: number
          company_id: string | null
          created_at: string
          direction: string
          id: string
          latency_ms: number | null
          network: string
          owner_share: number
          payer: string | null
          platform_fee: number
          session_key_id: string | null
          slug: string
          status: string
          treasury_share: number
          tx_hash: string | null
        }
        Insert: {
          agent_id?: string | null
          amount_usdc?: number
          company_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          latency_ms?: number | null
          network?: string
          owner_share?: number
          payer?: string | null
          platform_fee?: number
          session_key_id?: string | null
          slug: string
          status?: string
          treasury_share?: number
          tx_hash?: string | null
        }
        Update: {
          agent_id?: string | null
          amount_usdc?: number
          company_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          latency_ms?: number | null
          network?: string
          owner_share?: number
          payer?: string | null
          platform_fee?: number
          session_key_id?: string | null
          slug?: string
          status?: string
          treasury_share?: number
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "x402_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "x402_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_company_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "x402_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "x402_calls_session_key_id_fkey"
            columns: ["session_key_id"]
            isOneToOne: false
            referencedRelation: "agent_session_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      x402_endpoints: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          network: string
          path: string
          price_usdc: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          id?: string
          name: string
          network?: string
          path: string
          price_usdc?: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          network?: string
          path?: string
          price_usdc?: number
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_company_agents: {
        Row: {
          accent: string | null
          avatar: string | null
          company_id: string | null
          created_at: string | null
          handle: string | null
          id: string | null
          name: string | null
          performance: number | null
          revenue_generated: number | null
          role: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_company_stats: {
        Row: {
          agent_count: number | null
          agent_revenue: number | null
          company_id: string | null
          handle: string | null
          wallets_bound: number | null
          x402_calls: number | null
          x402_revenue: number | null
        }
        Insert: {
          agent_count?: never
          agent_revenue?: never
          company_id?: string | null
          handle?: string | null
          wallets_bound?: never
          x402_calls?: never
          x402_revenue?: never
        }
        Update: {
          agent_count?: never
          agent_revenue?: never
          company_id?: string | null
          handle?: string | null
          wallets_bound?: never
          x402_calls?: never
          x402_revenue?: never
        }
        Relationships: [
          {
            foreignKeyName: "handles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_feed: {
        Row: {
          amount: number | null
          created_at: string | null
          detail: string | null
          handle: string | null
          id: string | null
          kind: string | null
          source: string | null
          title: string | null
          tx_hash: string | null
        }
        Relationships: []
      }
      public_handle_wallets: {
        Row: {
          address_short: string | null
          chain: string | null
          handle_id: string | null
          id: string | null
          role: string | null
          slot: number | null
          verified: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_bindings_handle_id_fkey"
            columns: ["handle_id"]
            isOneToOne: false
            referencedRelation: "handles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_network_totals: {
        Row: {
          actions_24h: number | null
          agents: number | null
          companies: number | null
          paid_calls: number | null
          tasks: number | null
          usdc_paid: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _whitelist_ensure_row: {
        Args: { _email: string; _visitor_id: string }
        Returns: {
          chat_channel: string | null
          comment_post: boolean
          completed_at: string | null
          created_at: string
          email: string
          follow_farcaster: boolean
          follow_x: boolean
          id: string
          invite_code: string | null
          like_post: boolean
          share_post: boolean
          updated_at: string
          visitor_id: string
          visits: Json
        }
        SetofOptions: {
          from: "*"
          to: "whitelist_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _whitelist_snapshot: {
        Args: { r: Database["public"]["Tables"]["whitelist_progress"]["Row"] }
        Returns: Json
      }
      advance_referral: { Args: { _stage: string }; Returns: boolean }
      agent_spend:
        | {
            Args: { _amount: number; _session_key_id: string; _slug: string }
            Returns: {
              agent_id: string | null
              amount_usdc: number
              company_id: string | null
              created_at: string
              direction: string
              id: string
              latency_ms: number | null
              network: string
              owner_share: number
              payer: string | null
              platform_fee: number
              session_key_id: string | null
              slug: string
              status: string
              treasury_share: number
              tx_hash: string | null
            }
            SetofOptions: {
              from: "*"
              to: "x402_calls"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _action?: string
              _amount: number
              _session_key_id: string
              _slug: string
            }
            Returns: {
              agent_id: string | null
              amount_usdc: number
              company_id: string | null
              created_at: string
              direction: string
              id: string
              latency_ms: number | null
              network: string
              owner_share: number
              payer: string | null
              platform_fee: number
              session_key_id: string | null
              slug: string
              status: string
              treasury_share: number
              tx_hash: string | null
            }
            SetofOptions: {
              from: "*"
              to: "x402_calls"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      attribute_referral: { Args: { _code: string }; Returns: boolean }
      check_invite_code: { Args: { _code: string }; Returns: boolean }
      claim_earnings: { Args: { _company_id: string }; Returns: number }
      claim_whitelist_invite: {
        Args: { _email: string; _visitor_id: string }
        Returns: Json
      }
      ensure_referral_code: {
        Args: never
        Returns: {
          active: boolean
          code: string
          created_at: string
          handle_id: string | null
          id: string
          user_id: string
          uses: number
        }
        SetofOptions: {
          from: "*"
          to: "referral_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_whitelist_progress: {
        Args: { _email: string; _visitor_id: string }
        Returns: Json
      }
      mark_whitelist_visit: {
        Args: { _email: string; _task: string; _visitor_id: string }
        Returns: Json
      }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
      recompute_entry_score: {
        Args: { _entry_id: string }
        Returns: {
          build_score: number
          community_score: number
          company_id: string
          created_at: string
          handle_id: string | null
          id: string
          momentum_score: number
          pitch: string | null
          revenue_score: number
          season_id: string
          staked_total: number
          total_score: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contest_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_invite_code: { Args: { _code: string }; Returns: boolean }
      referral_code_valid: { Args: { _code: string }; Returns: boolean }
      spin_daily_wheel: {
        Args: { _company_id: string }
        Returns: {
          amount: number
          chain_network: string | null
          chain_status: string
          company_id: string
          created_at: string
          id: string
          label: string
          prize_kind: string
          rare: boolean
          settled_at: string | null
          spun_on: string
          tx_hash: string | null
          xp_awarded: number
        }
        SetofOptions: {
          from: "*"
          to: "wheel_spins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      teaser_insert_allowed: { Args: { p_session: string }; Returns: boolean }
      upsert_whitelist_task: {
        Args: {
          _chat_channel?: string
          _email: string
          _task: string
          _visitor_id: string
        }
        Returns: Json
      }
      user_has_company_seat: { Args: { _uid?: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
