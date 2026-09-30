export type UserRole = 'user' | 'admin';

export type AccessStatus = 'active' | 'revoked' | 'pending';

export type NewUserPolicy = 'auto_3_months' | 'auto_1_month' | 'approval_required';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  auth_provider_id: string;
  role: UserRole;
  access_status: AccessStatus;
  access_expires_at: string | null; // ISO string, null = no expiry (lifetime)
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export type ExtensionRequestStatus = 'pending' | 'approved' | 'declined';

export interface ExtensionRequest {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  current_expiry: string | null;
  requested_duration: string;
  reason: string | null;
  status: ExtensionRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface GatewayInfo {
  visible: boolean;
  heading: string;
  message: string;
  whatsapp: string;
  email: string;
  pricing: string;
  additional_notes: string;
}

export type NotificationCategory = 'New Content' | 'Update' | 'Important' | 'General';

export interface NotificationItem {
  id: string;
  title: string;
  category: NotificationCategory;
  message: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  is_read?: boolean;
  read_count?: number;
  read_by_users?: Array<{
    user_id: string;
    name: string;
    email: string;
    read_at: string;
  }>;
}
