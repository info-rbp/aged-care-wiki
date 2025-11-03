-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, suspended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- reader, contributor, approver, administrator, system_owner
  description TEXT,
  permissions TEXT NOT NULL, -- JSON array of permissions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Categories (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Business Units
CREATE TABLE IF NOT EXISTS business_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_label ON tags(label);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content_type TEXT NOT NULL, -- policy, procedure, work_instruction, form, template, guideline, register, checklist, faq
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_review, approved, published, archived, expired
  file_type TEXT NOT NULL, -- pdf, docx, xlsx, csv, pptx, html, markdown, image, text
  mime_type TEXT,
  
  -- Ownership and Review
  owner_id INTEGER NOT NULL,
  reviewer_id INTEGER,
  approver_id INTEGER,
  
  -- Dates
  effective_date DATE NOT NULL,
  review_due DATE NOT NULL,
  published_at DATETIME,
  archived_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Taxonomy
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER,
  business_unit_id INTEGER,
  
  -- Additional metadata
  external_reference TEXT,
  jurisdiction TEXT,
  standard_alignment TEXT,
  
  -- Settings
  download_allowed BOOLEAN DEFAULT 1,
  public_access BOOLEAN DEFAULT 0,
  
  -- Search
  search_content TEXT, -- Extracted text for full-text search
  
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES categories(id),
  FOREIGN KEY (business_unit_id) REFERENCES business_units(id)
);

CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_content_type ON documents(content_type);
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_effective_date ON documents(effective_date);
CREATE INDEX idx_documents_review_due ON documents(review_due);
CREATE INDEX idx_documents_business_unit ON documents(business_unit_id);

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  file_key TEXT NOT NULL, -- R2 storage key
  file_size INTEGER,
  checksum TEXT NOT NULL,
  uploader_id INTEGER NOT NULL,
  change_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES users(id),
  UNIQUE(document_id, version_number)
);

CREATE INDEX idx_versions_document ON document_versions(document_id);
CREATE INDEX idx_versions_current ON document_versions(document_id, is_current);

-- Document Tags (many-to-many)
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, tag_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON document_tags(tag_id);

-- Related Documents (many-to-many)
CREATE TABLE IF NOT EXISTS related_documents (
  document_id INTEGER NOT NULL,
  related_document_id INTEGER NOT NULL,
  relationship_type TEXT, -- related, supersedes, superseded_by, referenced_in
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, related_document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (related_document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private', -- public, private, restricted
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_owner ON collections(owner_id);

-- Collection Items
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER,
  PRIMARY KEY (collection_id, document_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL, -- create, update, approve, publish, archive, login, etc.
  object_type TEXT NOT NULL, -- document, user, role, etc.
  object_id INTEGER,
  changes TEXT, -- JSON of changes made
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_object ON audit_logs(object_type, object_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Review Notifications
CREATE TABLE IF NOT EXISTS review_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 30_day, 7_day, 1_day, overdue
  sent_at DATETIME,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE INDEX idx_notifications_document ON review_notifications(document_id);
CREATE INDEX idx_notifications_recipient ON review_notifications(recipient_id);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, document_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Document Views (for analytics)
CREATE TABLE IF NOT EXISTS document_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  user_id INTEGER,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_views_document ON document_views(document_id);
CREATE INDEX idx_views_user ON document_views(user_id);
CREATE INDEX idx_views_date ON document_views(viewed_at);

-- Search Queries (for analytics)
CREATE TABLE IF NOT EXISTS search_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id INTEGER,
  results_count INTEGER,
  clicked_document_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (clicked_document_id) REFERENCES documents(id)
);

CREATE INDEX idx_search_queries_query ON search_queries(query);
CREATE INDEX idx_search_queries_date ON search_queries(created_at);
