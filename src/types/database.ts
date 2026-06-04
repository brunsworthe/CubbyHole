export type VisibilityTier = "private" | "linked" | "custom";

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          birth_year: number | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          birth_year?: number | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          birth_year?: number | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      capsules: {
        Row: {
          id: string;
          household_id: string;
          child_id: string | null;
          title: string;
          description: string | null;
          object_url: string;
          thumbnail_url: string | null;
          visibility_tier: VisibilityTier;
          captured_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          child_id?: string | null;
          title: string;
          description?: string | null;
          object_url: string;
          thumbnail_url?: string | null;
          visibility_tier?: VisibilityTier;
          captured_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          child_id?: string | null;
          title?: string;
          description?: string | null;
          object_url?: string;
          thumbnail_url?: string | null;
          visibility_tier?: VisibilityTier;
          captured_at?: string | null;
          updated_at?: string;
        };
      };
      household_links: {
        Row: {
          id: string;
          requester_household_id: string;
          recipient_household_id: string;
          status: "pending" | "active" | "revoked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_household_id: string;
          recipient_household_id: string;
          status?: "pending" | "active" | "revoked";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_household_id?: string;
          recipient_household_id?: string;
          status?: "pending" | "active" | "revoked";
          updated_at?: string;
        };
      };
      object_permissions: {
        Row: {
          id: string;
          capsule_id: string;
          grantee_household_id: string;
          granted_by_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          grantee_household_id: string;
          granted_by_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          grantee_household_id?: string;
          granted_by_user_id?: string;
        };
      };
      one_off_shares: {
        Row: {
          id: string;
          capsule_id: string;
          token: string;
          created_by_user_id: string;
          expires_at: string;
          max_views: number | null;
          view_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          token?: string;
          created_by_user_id: string;
          expires_at: string;
          max_views?: number | null;
          view_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          token?: string;
          created_by_user_id?: string;
          expires_at?: string;
          max_views?: number | null;
          view_count?: number;
        };
      };
    };
    Enums: {
      visibility_tier: VisibilityTier;
    };
  };
};
