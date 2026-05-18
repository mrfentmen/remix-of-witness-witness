export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      biometric_credentials: {
        Row: {
          counter: number;
          created_at: string;
          credential_id: string;
          device_label: string | null;
          id: string;
          last_used_at: string | null;
          public_key: string;
          transports: string[] | null;
          user_id: string;
        };
        Insert: {
          counter?: number;
          created_at?: string;
          credential_id: string;
          device_label?: string | null;
          id?: string;
          last_used_at?: string | null;
          public_key: string;
          transports?: string[] | null;
          user_id: string;
        };
        Update: {
          counter?: number;
          created_at?: string;
          credential_id?: string;
          device_label?: string | null;
          id?: string;
          last_used_at?: string | null;
          public_key?: string;
          transports?: string[] | null;
          user_id?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          issued_at: string;
          key_id: string;
          payload: Json;
          recording_id: string;
          sha256: string;
          signature_b64: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          issued_at?: string;
          key_id: string;
          payload: Json;
          recording_id: string;
          sha256: string;
          signature_b64: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          issued_at?: string;
          key_id?: string;
          payload?: Json;
          recording_id?: string;
          sha256?: string;
          signature_b64?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_key_id_fkey";
            columns: ["key_id"];
            isOneToOne: false;
            referencedRelation: "signing_keys";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_locations: {
        Row: {
          accuracy: number | null;
          latitude: number;
          longitude: number;
          sos_active: boolean;
          sos_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accuracy?: number | null;
          latitude: number;
          longitude: number;
          sos_active?: boolean;
          sos_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accuracy?: number | null;
          latitude?: number;
          longitude?: number;
          sos_active?: boolean;
          sos_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
          is_primary: boolean;
          last_sync_at: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          id?: string;
          is_primary?: boolean;
          last_sync_at?: string;
          name?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
          is_primary?: boolean;
          last_sync_at?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      live_streams: {
        Row: {
          created_at: string;
          ended_at: string | null;
          gps_accuracy: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          mux_stream_id: string | null;
          playback_id: string;
          started_at: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          gps_accuracy?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          mux_stream_id?: string | null;
          playback_id: string;
          started_at?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          gps_accuracy?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          mux_stream_id?: string | null;
          playback_id?: string;
          started_at?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          created_at: string;
          ein: string | null;
          fiscal_sponsor: string | null;
          id: string;
          org_name: string;
          org_type: string;
          updated_at: string;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          ein?: string | null;
          fiscal_sponsor?: string | null;
          id?: string;
          org_name: string;
          org_type: string;
          updated_at?: string;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          ein?: string | null;
          fiscal_sponsor?: string | null;
          id?: string;
          org_name?: string;
          org_type?: string;
          updated_at?: string;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      location_shares: {
        Row: {
          created_at: string;
          id: string;
          recipient_alias: string | null;
          recipient_id: string;
          requester_alias: string | null;
          requester_id: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["location_share_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          recipient_alias?: string | null;
          recipient_id: string;
          requester_alias?: string | null;
          requester_id: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["location_share_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          recipient_alias?: string | null;
          recipient_id?: string;
          requester_alias?: string | null;
          requester_id?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["location_share_status"];
        };
        Relationships: [];
      };
      pin_lockout_state: {
        Row: {
          failed_attempts: number;
          last_attempt_at: string | null;
          locked_until: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          failed_attempts?: number;
          last_attempt_at?: string | null;
          locked_until?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          failed_attempts?: number;
          last_attempt_at?: string | null;
          locked_until?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          badges: string[];
          created_at: string;
          email: string | null;
          home_address: string | null;
          key_iv: string | null;
          key_salt: string | null;
          phone: string | null;
          pin_set: boolean;
          points: number;
          profile_type: string;
          updated_at: string;
          user_id: string;
          wrapped_master_key: string | null;
        };
        Insert: {
          badges?: string[];
          created_at?: string;
          email?: string | null;
          home_address?: string | null;
          key_iv?: string | null;
          key_salt?: string | null;
          phone?: string | null;
          pin_set?: boolean;
          points?: number;
          profile_type?: string;
          updated_at?: string;
          user_id: string;
          wrapped_master_key?: string | null;
        };
        Update: {
          badges?: string[];
          created_at?: string;
          email?: string | null;
          home_address?: string | null;
          key_iv?: string | null;
          key_salt?: string | null;
          phone?: string | null;
          pin_set?: boolean;
          points?: number;
          profile_type?: string;
          updated_at?: string;
          user_id?: string;
          wrapped_master_key?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          notif_live_nearby: boolean;
          notif_share_request: boolean;
          notif_sos: boolean;
          p256dh: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          notif_live_nearby?: boolean;
          notif_share_request?: boolean;
          notif_sos?: boolean;
          p256dh: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          notif_live_nearby?: boolean;
          notif_share_request?: boolean;
          notif_sos?: boolean;
          p256dh?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      recordings: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          duration_ms: number;
          encrypted: boolean;
          gps_accuracy: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          gps_track: Json | null;
          id: string;
          is_public: boolean;
          mime_type: string;
          published_at: string | null;
          recorded_at: string;
          s3_key: string | null;
          sha256: string;
          size_bytes: number;
          thumbnail_data_url: string | null;
          title: string | null;
          uploaded_at: string | null;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          duration_ms: number;
          encrypted: boolean;
          gps_accuracy?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_track?: Json | null;
          id: string;
          is_public?: boolean;
          mime_type: string;
          published_at?: string | null;
          recorded_at: string;
          s3_key?: string | null;
          sha256: string;
          size_bytes: number;
          thumbnail_data_url?: string | null;
          title?: string | null;
          uploaded_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          duration_ms?: number;
          encrypted?: boolean;
          gps_accuracy?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_track?: Json | null;
          id?: string;
          is_public?: boolean;
          mime_type?: string;
          published_at?: string | null;
          recorded_at?: string;
          s3_key?: string | null;
          sha256?: string;
          size_bytes?: number;
          thumbnail_data_url?: string | null;
          title?: string | null;
          uploaded_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          reference_id: string | null;
          report_type: string | null;
          status: string;
          target_id: string | null;
          target_type: string | null;
          title: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          reference_id?: string | null;
          report_type?: string | null;
          status?: string;
          target_id?: string | null;
          target_type?: string | null;
          title?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          reference_id?: string | null;
          report_type?: string | null;
          status?: string;
          target_id?: string | null;
          target_type?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      recovery_requests: {
        Row: {
          approval_token: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          responded_at: string | null;
          status: string;
          trusted_contact_id: string;
          user_id: string;
        };
        Insert: {
          approval_token?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          responded_at?: string | null;
          status?: string;
          trusted_contact_id: string;
          user_id: string;
        };
        Update: {
          approval_token?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          responded_at?: string | null;
          status?: string;
          trusted_contact_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      service_status: {
        Row: {
          id: string;
          name: string;
          status: string;
          uptime_90day: number;
        };
        Insert: {
          id?: string;
          name: string;
          status?: string;
          uptime_90day?: number;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          uptime_90day?: number;
        };
        Relationships: [];
      };
      signing_keys: {
        Row: {
          active: boolean;
          alg: string;
          created_at: string;
          id: string;
          private_key_b64: string;
          public_key_b64: string;
        };
        Insert: {
          active?: boolean;
          alg?: string;
          created_at?: string;
          id?: string;
          private_key_b64: string;
          public_key_b64: string;
        };
        Update: {
          active?: boolean;
          alg?: string;
          created_at?: string;
          id?: string;
          private_key_b64?: string;
          public_key_b64?: string;
        };
        Relationships: [];
      };
      trusted_contacts: {
        Row: {
          contact_email: string | null;
          contact_name: string;
          contact_phone: string | null;
          contact_user_id: string | null;
          created_at: string;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          contact_email?: string | null;
          contact_name: string;
          contact_phone?: string | null;
          contact_user_id?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          contact_email?: string | null;
          contact_name?: string;
          contact_phone?: string | null;
          contact_user_id?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      transparency_reports: {
        Row: {
          id: string;
          published_at: string;
          quarter: string;
          report_data: Json;
        };
        Insert: {
          id?: string;
          published_at?: string;
          quarter: string;
          report_data: Json;
        };
        Update: {
          id?: string;
          published_at?: string;
          quarter?: string;
          report_data?: Json;
        };
        Relationships: [];
      };
      vapid_keys: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          private_key: string;
          public_key: string;
          subject: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          private_key: string;
          public_key: string;
          subject?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          private_key?: string;
          public_key?: string;
          subject?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_shared_contacts: {
        Args: never;
        Returns: {
          alias: string;
          contact_user_id: string;
          created_at: string;
          direction: string;
          home_address: string;
          latitude: number;
          location_updated_at: string;
          longitude: number;
          phone: string;
          share_id: string;
          sos_active: boolean;
          sos_at: string;
          status: Database["public"]["Enums"]["location_share_status"];
        }[];
      };
      has_accepted_share: {
        Args: { _target: string; _viewer: string };
        Returns: boolean;
      };
      request_location_share: {
        Args: { _alias?: string; _phone: string };
        Returns: string;
      };
      respond_location_share: {
        Args: { _accept: boolean; _alias?: string; _share_id: string };
        Returns: undefined;
      };
      set_my_sos_state: { Args: { _active: boolean }; Returns: undefined };
    };
    Enums: {
      location_share_status: "pending" | "accepted" | "declined";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      location_share_status: ["pending", "accepted", "declined"],
    },
  },
} as const;
