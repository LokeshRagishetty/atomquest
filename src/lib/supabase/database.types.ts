export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "employee" | "manager" | "admin";
          manager_id: string | null;
          department: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role?: "employee" | "manager" | "admin";
          manager_id?: string | null;
          department: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      shared_goals: {
        Row: {
          id: string;
          title: string;
          description: string;
          target: string;
          assigned_department: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          target: string;
          assigned_department: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["shared_goals"]["Insert"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          employee_id: string;
          thrust_area: string;
          title: string;
          description: string;
          uom_type: "numeric_min" | "numeric_max" | "percentage" | "timeline" | "zero_based";
          target: string;
          weightage: number;
          status: "draft" | "submitted" | "approved" | "rejected";
          locked: boolean;
          shared_goal_id: string | null;
          review_comment: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          thrust_area: string;
          title: string;
          description: string;
          uom_type: "numeric_min" | "numeric_max" | "percentage" | "timeline" | "zero_based";
          target: string;
          weightage: number;
          status?: "draft" | "submitted" | "approved" | "rejected";
          locked?: boolean;
          shared_goal_id?: string | null;
          review_comment?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          goal_id: string;
          quarter: "q1" | "q2" | "q3" | "q4";
          achievement: string;
          progress_status: "not_started" | "on_track" | "completed" | "delayed";
          manager_comment: string | null;
          completion_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          quarter: "q1" | "q2" | "q3" | "q4";
          achievement: string;
          progress_status?: "not_started" | "on_track" | "completed" | "delayed";
          manager_comment?: string | null;
          completion_percentage?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checkins"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_value: Json;
          new_value: Json;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_value?: Json;
          new_value?: Json;
          timestamp?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: "goal_approved" | "goal_rejected" | "goal_submitted" | "checkin_reminder" | "system";
          read: boolean;
          link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: "goal_approved" | "goal_rejected" | "goal_submitted" | "checkin_reminder" | "system";
          read?: boolean;
          link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "employee" | "manager" | "admin";
      goal_status: "draft" | "submitted" | "approved" | "rejected";
      uom_type: "numeric_min" | "numeric_max" | "percentage" | "timeline" | "zero_based";
      quarter: "q1" | "q2" | "q3" | "q4";
      progress_status: "not_started" | "on_track" | "completed" | "delayed";
    };
    CompositeTypes: Record<string, never>;
  };
};
