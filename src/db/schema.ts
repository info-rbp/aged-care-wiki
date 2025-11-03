// Database type definitions

export interface Bindings {
  DB: D1Database;
  STORAGE: R2Bucket;
}

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Role {
  id: number;
  name: 'reader' | 'contributor' | 'approver' | 'administrator' | 'system_owner';
  description: string;
  permissions: string; // JSON string
  created_at: string;
}

export interface Document {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content_type: 'policy' | 'procedure' | 'work_instruction' | 'form' | 'template' | 'guideline' | 'register' | 'checklist' | 'faq';
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'expired';
  file_type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'pptx' | 'html' | 'markdown' | 'image' | 'text';
  mime_type: string;
  owner_id: number;
  reviewer_id?: number;
  approver_id?: number;
  effective_date: string;
  review_due: string;
  published_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  category_id: number;
  subcategory_id?: number;
  business_unit_id?: number;
  external_reference?: string;
  jurisdiction?: string;
  standard_alignment?: string;
  download_allowed: boolean;
  public_access: boolean;
  search_content?: string;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  file_key: string;
  file_size: number;
  checksum: string;
  uploader_id: number;
  change_reason: string;
  created_at: string;
  is_current: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: number;
  label: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface BusinessUnit {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number;
  action: string;
  object_type: string;
  object_id?: number;
  changes: string; // JSON string
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
  last_activity: string;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
  visibility: 'public' | 'private' | 'restricted';
  owner_id: number;
  created_at: string;
  updated_at: string;
}
