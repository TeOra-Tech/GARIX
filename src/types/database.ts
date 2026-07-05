export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          customer_id: string
          garage_id: string
          id: string
          notes: string | null
          request_id: string | null
          slot_id: string | null
          starts_at: string
          status: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          garage_id: string
          id?: string
          notes?: string | null
          request_id?: string | null
          slot_id?: string | null
          starts_at: string
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          garage_id?: string
          id?: string
          notes?: string | null
          request_id?: string | null
          slot_id?: string | null
          starts_at?: string
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          ends_at: string
          garage_id: string
          id: string
          is_booked: boolean
          starts_at: string
        }
        Insert: {
          ends_at: string
          garage_id: string
          id?: string
          is_booked?: boolean
          starts_at: string
        }
        Update: {
          ends_at?: string
          garage_id?: string
          id?: string
          is_booked?: boolean
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rules: {
        Row: {
          garage_id: string
          lead_time_hours: number
          max_daily_bookings: number | null
          slot_minutes: number
          updated_at: string
        }
        Insert: {
          garage_id: string
          lead_time_hours?: number
          max_daily_bookings?: number | null
          slot_minutes?: number
          updated_at?: string
        }
        Update: {
          garage_id?: string
          lead_time_hours?: number
          max_daily_bookings?: number | null
          slot_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rules_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: true
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      breakdown_requests: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          location: unknown
          status: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          location: unknown
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          location?: unknown
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdown_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_types: {
        Row: {
          id: string
          max_kw: number | null
          name: string
        }
        Insert: {
          id?: string
          max_kw?: number | null
          name: string
        }
        Update: {
          id?: string
          max_kw?: number | null
          name?: string
        }
        Relationships: []
      }
      charging_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          rating: number
          station_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          station_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charging_reviews_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "charging_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charging_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charging_station_chargers: {
        Row: {
          charger_type_id: string
          count: number
          station_id: string
        }
        Insert: {
          charger_type_id: string
          count?: number
          station_id: string
        }
        Update: {
          charger_type_id?: string
          count?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charging_station_chargers_charger_type_id_fkey"
            columns: ["charger_type_id"]
            isOneToOne: false
            referencedRelation: "charger_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charging_station_chargers_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "charging_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      charging_stations: {
        Row: {
          address: string | null
          county: string | null
          created_at: string
          id: string
          is_public: boolean
          location: unknown
          name: string
          operator: string | null
        }
        Insert: {
          address?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          location: unknown
          name: string
          operator?: string | null
        }
        Update: {
          address?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          location?: unknown
          name?: string
          operator?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          garage_id: string
          id: string
          last_message_at: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
        }
        Insert: {
          created_at?: string
          customer_id: string
          garage_id: string
          id?: string
          last_message_at?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Update: {
          created_at?: string
          customer_id?: string
          garage_id?: string
          id?: string
          last_message_at?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          credits: number
          id: string
          is_active: boolean
          price_eur: number
          sort_order: number
          stripe_price_id: string | null
        }
        Insert: {
          credits: number
          id?: string
          is_active?: boolean
          price_eur: number
          sort_order?: number
          stripe_price_id?: string | null
        }
        Update: {
          credits?: number
          id?: string
          is_active?: boolean
          price_eur?: number
          sort_order?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          garage_id: string
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          garage_id: string
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          garage_id?: string
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["credit_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_wallets: {
        Row: {
          balance: number
          garage_id: string
          low_balance_threshold: number
          updated_at: string
        }
        Insert: {
          balance?: number
          garage_id: string
          low_balance_threshold?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          garage_id?: string
          low_balance_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_wallets_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: true
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          arrived_at: string | null
          breakdown_id: string
          completed_at: string | null
          dispatched_at: string
          eta_minutes: number | null
          garage_id: string
          id: string
        }
        Insert: {
          arrived_at?: string | null
          breakdown_id: string
          completed_at?: string | null
          dispatched_at?: string
          eta_minutes?: number | null
          garage_id: string
          id?: string
        }
        Update: {
          arrived_at?: string | null
          breakdown_id?: string
          completed_at?: string | null
          dispatched_at?: string
          eta_minutes?: number | null
          garage_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_breakdown_id_fkey"
            columns: ["breakdown_id"]
            isOneToOne: false
            referencedRelation: "breakdown_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          reason: string
          request_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          reason: string
          request_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          reason?: string
          request_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_campaigns: {
        Row: {
          created_at: string
          credits_charged: number
          ends_at: string
          garage_id: string
          id: string
          placement: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          credits_charged?: number
          ends_at: string
          garage_id: string
          id?: string
          placement?: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          credits_charged?: number
          ends_at?: string
          garage_id?: string
          id?: string
          placement?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_campaigns_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_payments: {
        Row: {
          amount_eur: number | null
          campaign_id: string
          created_at: string
          id: string
          payment_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          campaign_id: string
          created_at?: string
          id?: string
          payment_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          campaign_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_payments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "featured_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_managers: {
        Row: {
          fleet_id: string
          role: string
          user_id: string
        }
        Insert: {
          fleet_id: string
          role?: string
          user_id: string
        }
        Update: {
          fleet_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_managers_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          fleet_id: string
          vehicle_id: string
        }
        Insert: {
          fleet_id: string
          vehicle_id: string
        }
        Update: {
          fleet_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          company_name: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_certifications: {
        Row: {
          created_at: string
          document_path: string | null
          expires_at: string | null
          garage_id: string
          id: string
          issuing_body: string | null
          name: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          expires_at?: string | null
          garage_id: string
          id?: string
          issuing_body?: string | null
          name: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          document_path?: string | null
          expires_at?: string | null
          garage_id?: string
          id?: string
          issuing_body?: string | null
          name?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "garage_certifications_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_locations: {
        Row: {
          country_code: string
          county: string
          created_at: string
          eircode: string | null
          garage_id: string
          id: string
          is_primary: boolean
          line1: string
          line2: string | null
          location: unknown
          town: string
        }
        Insert: {
          country_code?: string
          county: string
          created_at?: string
          eircode?: string | null
          garage_id: string
          id?: string
          is_primary?: boolean
          line1: string
          line2?: string | null
          location: unknown
          town: string
        }
        Update: {
          country_code?: string
          county?: string
          created_at?: string
          eircode?: string | null
          garage_id?: string
          id?: string
          is_primary?: boolean
          line1?: string
          line2?: string | null
          location?: unknown
          town?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_locations_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_photos: {
        Row: {
          caption: string | null
          created_at: string
          garage_id: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          garage_id: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          garage_id?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_photos_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_services: {
        Row: {
          garage_id: string
          id: string
          notes: string | null
          price_from: number | null
          repair_category_id: string
        }
        Insert: {
          garage_id: string
          id?: string
          notes?: string | null
          price_from?: number | null
          repair_category_id: string
        }
        Update: {
          garage_id?: string
          id?: string
          notes?: string | null
          price_from?: number | null
          repair_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_garage_services_category"
            columns: ["repair_category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_services_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avg_rating: number
          completed_jobs_count: number
          contact_person: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_ev_specialist: boolean
          logo_url: string | null
          name: string
          offers_collection: boolean
          opening_hours: Json
          owner_id: string
          phone: string
          review_count: number
          service_radius_km: number
          slug: string
          status: Database["public"]["Enums"]["garage_status"]
          updated_at: string
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avg_rating?: number
          completed_jobs_count?: number
          contact_person: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_ev_specialist?: boolean
          logo_url?: string | null
          name: string
          offers_collection?: boolean
          opening_hours?: Json
          owner_id: string
          phone: string
          review_count?: number
          service_radius_km?: number
          slug: string
          status?: Database["public"]["Enums"]["garage_status"]
          updated_at?: string
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avg_rating?: number
          completed_jobs_count?: number
          contact_person?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_ev_specialist?: boolean
          logo_url?: string | null
          name?: string
          offers_collection?: boolean
          opening_hours?: Json
          owner_id?: string
          phone?: string
          review_count?: number
          service_radius_km?: number
          slug?: string
          status?: Database["public"]["Enums"]["garage_status"]
          updated_at?: string
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garages_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_reference: string | null
          created_at: string
          id: string
          insurer_name: string
          policy_number: string | null
          request_id: string
          status: string
        }
        Insert: {
          approved_amount?: number | null
          claim_reference?: string | null
          created_at?: string
          id?: string
          insurer_name: string
          policy_number?: string | null
          request_id: string
          status?: string
        }
        Update: {
          approved_amount?: number | null
          claim_reference?: string | null
          created_at?: string
          id?: string
          insurer_name?: string
          policy_number?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_documents: {
        Row: {
          claim_id: string
          created_at: string
          doc_type: string | null
          id: string
          storage_path: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          doc_type?: string | null
          id?: string
          storage_path: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          doc_type?: string | null
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          part_id: string
          quantity: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          part_id: string
          quantity?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          part_id?: string
          quantity?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          created_at: string
          id: string
          interval_km: number | null
          interval_months: number | null
          last_done_at: string | null
          last_done_km: number | null
          service_type: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_at?: string | null
          last_done_km?: number | null
          service_type: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_at?: string | null
          last_done_km?: number | null
          service_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          attachment_type: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          in_app_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          data: Json
          id: string
          read_at: string | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          garage_id: string | null
          id: string
          items: Json
          status: string
          supplier_id: string | null
          total_eur: number | null
        }
        Insert: {
          created_at?: string
          garage_id?: string | null
          id?: string
          items?: Json
          status?: string
          supplier_id?: string | null
          total_eur?: number | null
        }
        Update: {
          created_at?: string
          garage_id?: string | null
          id?: string
          items?: Json
          status?: string
          supplier_id?: string | null
          total_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          oem_number: string | null
          sku: string | null
          supplier_id: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          oem_number?: string | null
          sku?: string | null
          supplier_id?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          oem_number?: string | null
          sku?: string | null
          supplier_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_eur: number
          created_at: string
          credit_pack_id: string | null
          credits_purchased: number
          garage_id: string
          id: string
          invoice_path: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_eur: number
          created_at?: string
          credit_pack_id?: string | null
          credits_purchased: number
          garage_id: string
          id?: string
          invoice_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_eur?: number
          created_at?: string
          credit_pack_id?: string | null
          credits_purchased?: number
          garage_id?: string
          id?: string
          invoice_path?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_credit_pack_id_fkey"
            columns: ["credit_pack_id"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          id: string
          item_type: string
          line_total: number | null
          quantity: number
          quote_id: string
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          item_type: string
          line_total?: number | null
          quantity?: number
          quote_id: string
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          quote_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          credits_charged: number
          estimated_duration_hours: number | null
          garage_id: string
          grand_total: number | null
          id: string
          is_priority: boolean
          labour_cost: number
          labour_vat: number | null
          labour_vat_rate: number
          notes: string | null
          parts_cost: number
          parts_vat: number | null
          parts_vat_rate: number
          request_id: string
          status: Database["public"]["Enums"]["quote_status"]
          total_vat: number | null
          updated_at: string
          valid_until: string
          warranty_info: string | null
        }
        Insert: {
          created_at?: string
          credits_charged?: number
          estimated_duration_hours?: number | null
          garage_id: string
          grand_total?: number | null
          id?: string
          is_priority?: boolean
          labour_cost: number
          labour_vat?: number | null
          labour_vat_rate?: number
          notes?: string | null
          parts_cost: number
          parts_vat?: number | null
          parts_vat_rate?: number
          request_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_vat?: number | null
          updated_at?: string
          valid_until?: string
          warranty_info?: string | null
        }
        Update: {
          created_at?: string
          credits_charged?: number
          estimated_duration_hours?: number | null
          garage_id?: string
          grand_total?: number | null
          id?: string
          is_priority?: boolean
          labour_cost?: number
          labour_vat?: number | null
          labour_vat_rate?: number
          notes?: string | null
          parts_cost?: number
          parts_vat?: number | null
          parts_vat_rate?: number
          request_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_vat?: number | null
          updated_at?: string
          valid_until?: string
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          due_at: string
          id: string
          schedule_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          due_at: string
          id?: string
          schedule_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          due_at?: string
          id?: string
          schedule_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_predictions: {
        Row: {
          confidence: number | null
          created_at: string
          features_used: Json | null
          id: string
          model_version: string
          predicted_labour_cost: number | null
          predicted_parts_cost: number | null
          request_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          features_used?: Json | null
          id?: string
          model_version: string
          predicted_labour_cost?: number | null
          predicted_parts_cost?: number | null
          request_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          features_used?: Json | null
          id?: string
          model_version?: string
          predicted_labour_cost?: number | null
          predicted_parts_cost?: number | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_predictions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_training_data: {
        Row: {
          created_at: string
          id: string
          labour_cost: number | null
          labour_hours: number | null
          parts_cost: number | null
          quote_id: string | null
          quote_outcome: string | null
          region: string | null
          repair_category: string | null
          repair_outcome: string | null
          request_id: string | null
          vehicle_snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          labour_cost?: number | null
          labour_hours?: number | null
          parts_cost?: number | null
          quote_id?: string | null
          quote_outcome?: string | null
          region?: string | null
          repair_category?: string | null
          repair_outcome?: string | null
          request_id?: string | null
          vehicle_snapshot: Json
        }
        Update: {
          created_at?: string
          id?: string
          labour_cost?: number | null
          labour_hours?: number | null
          parts_cost?: number | null
          quote_id?: string | null
          quote_outcome?: string | null
          region?: string | null
          repair_category?: string | null
          repair_outcome?: string | null
          request_id?: string | null
          vehicle_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "repair_training_data_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_training_data_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          handled_by: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          handled_by?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          created_at: string
          id: string
          media_type: string
          request_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          request_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          request_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          id: string
          review_id: string
          storage_path: string
        }
        Insert: {
          id?: string
          review_id: string
          storage_path: string
        }
        Update: {
          id?: string
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string
          fraud_score: number | null
          garage_id: string
          garage_responded_at: string | null
          garage_response: string | null
          id: string
          is_hidden: boolean
          is_moderated: boolean
          rating_communication: number
          rating_overall: number
          rating_price: number
          rating_quality: number
          rating_speed: number
          request_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id: string
          fraud_score?: number | null
          garage_id: string
          garage_responded_at?: string | null
          garage_response?: string | null
          id?: string
          is_hidden?: boolean
          is_moderated?: boolean
          rating_communication: number
          rating_overall: number
          rating_price: number
          rating_quality: number
          rating_speed: number
          request_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string
          fraud_score?: number | null
          garage_id?: string
          garage_responded_at?: string | null
          garage_response?: string | null
          id?: string
          is_hidden?: boolean
          is_moderated?: boolean
          rating_communication?: number
          rating_overall?: number
          rating_price?: number
          rating_quality?: number
          rating_speed?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_records: {
        Row: {
          created_at: string
          garage_id: string | null
          id: string
          mileage_km: number | null
          parts_used: Json | null
          performed_at: string
          request_id: string | null
          total_cost: number | null
          vehicle_id: string
          work_summary: string
        }
        Insert: {
          created_at?: string
          garage_id?: string | null
          id?: string
          mileage_km?: number | null
          parts_used?: Json | null
          performed_at: string
          request_id?: string | null
          total_cost?: number | null
          vehicle_id: string
          work_summary: string
        }
        Update: {
          created_at?: string
          garage_id?: string | null
          id?: string
          mileage_km?: number | null
          parts_used?: Json | null
          performed_at?: string
          request_id?: string | null
          total_cost?: number | null
          vehicle_id?: string
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_records_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          accepted_quote_id: string | null
          budget_amount: number | null
          collection_required: boolean
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string
          expected_completion_date: string | null
          expires_at: string
          id: string
          location: unknown
          location_county: string | null
          location_town: string | null
          problem_category_id: string | null
          service_category_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
          vehicle_id: string
        }
        Insert: {
          accepted_quote_id?: string | null
          budget_amount?: number | null
          collection_required?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description: string
          expected_completion_date?: string | null
          expires_at?: string
          id?: string
          location?: unknown
          location_county?: string | null
          location_town?: string | null
          problem_category_id?: string | null
          service_category_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          vehicle_id: string
        }
        Update: {
          accepted_quote_id?: string | null
          budget_amount?: number | null
          collection_required?: boolean
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          expected_completion_date?: string | null
          expires_at?: string
          id?: string
          location?: unknown
          location_county?: string | null
          location_town?: string | null
          problem_category_id?: string | null
          service_category_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_accepted_quote"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_problem_category_id_fkey"
            columns: ["problem_category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "repair_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: string
          features: Json
          id: string
          included_credits: number
          is_active: boolean
          monthly_price_eur: number
          name: string
          stripe_price_id: string | null
        }
        Insert: {
          code: string
          features?: Json
          id?: string
          included_credits?: number
          is_active?: boolean
          monthly_price_eur: number
          name: string
          stripe_price_id?: string | null
        }
        Update: {
          code?: string
          features?: Json
          id?: string
          included_credits?: number
          is_active?: boolean
          monthly_price_eur?: number
          name?: string
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          id: string
          metric: string
          period_end: string
          period_start: string
          quantity: number
          subscription_id: string
        }
        Insert: {
          id?: string
          metric: string
          period_end: string
          period_start: string
          quantity?: number
          subscription_id: string
        }
        Update: {
          id?: string
          metric?: string
          period_end?: string
          period_start?: string
          quantity?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          garage_id: string
          id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          garage_id: string
          id?: string
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          garage_id?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          country_code: string
          county: string
          created_at: string
          eircode: string | null
          id: string
          is_default: boolean
          label: string | null
          line1: string
          line2: string | null
          location: unknown
          town: string
          user_id: string
        }
        Insert: {
          country_code?: string
          county: string
          created_at?: string
          eircode?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          line1: string
          line2?: string | null
          location?: unknown
          town: string
          user_id: string
        }
        Update: {
          country_code?: string
          county?: string
          created_at?: string
          eircode?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          line1?: string
          line2?: string | null
          location?: unknown
          town?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          data_deletion_requested_at: string | null
          email: string
          email_verified: boolean
          full_name: string
          id: string
          marketing_opt_in: boolean
          mobile_number: string | null
          mobile_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          data_deletion_requested_at?: string | null
          email: string
          email_verified?: boolean
          full_name: string
          id: string
          marketing_opt_in?: boolean
          mobile_number?: string | null
          mobile_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          data_deletion_requested_at?: string | null
          email?: string
          email_verified?: boolean
          full_name?: string
          id?: string
          marketing_opt_in?: boolean
          mobile_number?: string | null
          mobile_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vat_calculations: {
        Row: {
          calculated_at: string
          grand_total: number
          id: string
          labour_net: number
          labour_vat: number
          labour_vat_rate: number
          parts_net: number
          parts_vat: number
          parts_vat_rate: number
          quote_id: string | null
          total_vat: number
        }
        Insert: {
          calculated_at?: string
          grand_total: number
          id?: string
          labour_net: number
          labour_vat: number
          labour_vat_rate: number
          parts_net: number
          parts_vat: number
          parts_vat_rate: number
          quote_id?: string | null
          total_vat: number
        }
        Update: {
          calculated_at?: string
          grand_total?: number
          id?: string
          labour_net?: number
          labour_vat?: number
          labour_vat_rate?: number
          parts_net?: number
          parts_vat?: number
          parts_vat_rate?: number
          quote_id?: string | null
          total_vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "vat_calculations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_rates: {
        Row: {
          code: string
          id: string
          rate: number
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          code: string
          id?: string
          rate: number
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          code?: string
          id?: string
          rate?: number
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          issued_at: string | null
          storage_path: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          issued_at?: string | null
          storage_path: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          issued_at?: string | null
          storage_path?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_engines: {
        Row: {
          id: string
          is_custom: boolean
          label: string
          litres: number | null
        }
        Insert: {
          id?: string
          is_custom?: boolean
          label: string
          litres?: number | null
        }
        Update: {
          id?: string
          is_custom?: boolean
          label?: string
          litres?: number | null
        }
        Relationships: []
      }
      vehicle_history: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          garage_id: string | null
          id: string
          mileage_km: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type: string
          garage_id?: string | null
          id?: string
          mileage_km?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          garage_id?: string | null
          id?: string
          mileage_km?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_history_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_makes: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          id: string
          make_id: string
          name: string
        }
        Insert: {
          id?: string
          make_id: string
          name: string
        }
        Update: {
          id?: string
          make_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          engine_id: string | null
          engine_size_custom: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          lookup_payload: Json | null
          lookup_source: string | null
          make_id: string | null
          make_text: string | null
          mileage_km: number | null
          model_id: string | null
          model_text: string | null
          owner_id: string
          registration_number: string
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          variant: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          engine_id?: string | null
          engine_size_custom?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          lookup_payload?: Json | null
          lookup_source?: string | null
          make_id?: string | null
          make_text?: string | null
          mileage_km?: number | null
          model_id?: string | null
          model_text?: string | null
          owner_id: string
          registration_number: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          variant?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          engine_id?: string | null
          engine_size_custom?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          lookup_payload?: Json | null
          lookup_source?: string | null
          make_id?: string | null
          make_text?: string | null
          mileage_km?: number | null
          model_id?: string | null
          model_text?: string | null
          owner_id?: string
          registration_number?: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          variant?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_engine_id_fkey"
            columns: ["engine_id"]
            isOneToOne: false
            referencedRelation: "vehicle_engines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_quote: { Args: { p_quote_id: string }; Returns: undefined }
      add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_garage_id: string
          p_reference?: string
          p_type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Returns: number
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      complete_job: { Args: { p_request_id: string }; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      g_radius: { Args: { p_garage_id: string }; Returns: number }
      garages_matching_request: {
        Args: { p_request_id: string }
        Returns: {
          garage_id: string
          owner_id: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      owns_garage: { Args: { g: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      search_garages: {
        Args: {
          p_category?: string
          p_collection?: boolean
          p_ev_only?: boolean
          p_lat: number
          p_lng: number
          p_min_rating?: number
          p_radius_km?: number
        }
        Returns: {
          avg_rating: number
          county: string
          distance_km: number
          garage_id: string
          logo_url: string
          name: string
          review_count: number
          slug: string
          town: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_garage_id: string
          p_reference?: string
          p_type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Returns: number
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      conversation_status: "active" | "archived" | "closed"
      credit_tx_type:
        | "purchase"
        | "quote_fee"
        | "priority_quote_fee"
        | "featured_listing_fee"
        | "refund"
        | "admin_adjustment"
        | "bonus"
      fuel_type:
        | "petrol"
        | "diesel"
        | "hybrid"
        | "plugin_hybrid"
        | "electric"
        | "lpg"
        | "other"
      garage_status:
        | "pending_verification"
        | "pending_approval"
        | "active"
        | "suspended"
        | "rejected"
      notification_channel: "in_app" | "email" | "sms"
      notification_type:
        | "new_service_request"
        | "new_quote"
        | "quote_accepted"
        | "quote_rejected"
        | "credit_purchase"
        | "credit_low"
        | "new_review"
        | "garage_approved"
        | "garage_rejected"
        | "new_message"
        | "job_completed"
        | "system"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      quote_status:
        "submitted" | "accepted" | "rejected" | "withdrawn" | "expired"
      request_status:
        | "draft"
        | "open"
        | "quoted"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "expired"
      transmission_type: "manual" | "automatic" | "semi_automatic" | "cvt"
      urgency_level: "emergency" | "within_24h" | "this_week" | "flexible"
      user_role: "customer" | "garage_owner" | "admin"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
      conversation_status: ["active", "archived", "closed"],
      credit_tx_type: [
        "purchase",
        "quote_fee",
        "priority_quote_fee",
        "featured_listing_fee",
        "refund",
        "admin_adjustment",
        "bonus",
      ],
      fuel_type: [
        "petrol",
        "diesel",
        "hybrid",
        "plugin_hybrid",
        "electric",
        "lpg",
        "other",
      ],
      garage_status: [
        "pending_verification",
        "pending_approval",
        "active",
        "suspended",
        "rejected",
      ],
      notification_channel: ["in_app", "email", "sms"],
      notification_type: [
        "new_service_request",
        "new_quote",
        "quote_accepted",
        "quote_rejected",
        "credit_purchase",
        "credit_low",
        "new_review",
        "garage_approved",
        "garage_rejected",
        "new_message",
        "job_completed",
        "system",
      ],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      quote_status: [
        "submitted",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
      ],
      request_status: [
        "draft",
        "open",
        "quoted",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
      ],
      transmission_type: ["manual", "automatic", "semi_automatic", "cvt"],
      urgency_level: ["emergency", "within_24h", "this_week", "flexible"],
      user_role: ["customer", "garage_owner", "admin"],
    },
  },
} as const
