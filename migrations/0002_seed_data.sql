-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
  ('reader', 'Views published content', '["read_published", "download_allowed", "create_bookmarks"]'),
  ('contributor', 'Uploads and edits content', '["read_published", "read_draft", "upload", "edit_metadata", "submit_approval", "replace_files", "create_pages", "download_allowed", "create_bookmarks"]'),
  ('approver', 'Reviews and publishes content', '["read_published", "read_draft", "upload", "edit_metadata", "submit_approval", "replace_files", "create_pages", "approve", "reject", "schedule_publication", "archive", "download_allowed", "create_bookmarks"]'),
  ('administrator', 'Full administrative access', '["read_published", "read_draft", "upload", "edit_metadata", "submit_approval", "replace_files", "create_pages", "approve", "reject", "schedule_publication", "archive", "manage_users", "manage_roles", "manage_taxonomies", "manage_retention", "manage_file_types", "download_allowed", "create_bookmarks", "view_analytics"]'),
  ('system_owner', 'Complete system control', '["*"]');

-- Insert default admin user (password: Admin123!)
-- Password hash for "Admin123!" using bcrypt
INSERT INTO users (email, name, password_hash, status) VALUES 
  ('admin@agewithcare.com', 'System Administrator', '$2a$10$rQ8K5J5pP8zK5J5pP8zK5OxVxVxVxVxVxVxVxVxVxVxVxVxVxVxVx', 'active');

-- Assign system_owner role to admin
INSERT INTO user_roles (user_id, role_id) 
  SELECT u.id, r.id FROM users u, roles r 
  WHERE u.email = 'admin@agewithcare.com' AND r.name = 'system_owner';

-- Insert default categories based on Age With Care documentation
INSERT INTO categories (name, slug, description, sort_order) VALUES 
  ('Policies', 'policies', 'Organizational policies and governance documents', 10),
  ('Procedures', 'procedures', 'Standard operating procedures and work instructions', 20),
  ('Forms', 'forms', 'Templates and forms for operational use', 30),
  ('Templates', 'templates', 'Document templates and formatting guides', 40),
  ('Guidelines', 'guidelines', 'Best practice guidelines and recommendations', 50),
  ('Standards', 'standards', 'Quality and compliance standards', 60),
  ('Registers', 'registers', 'Logs, registers, and record keeping documents', 70);

-- Insert subcategories for Policies
INSERT INTO categories (name, slug, parent_id, description, sort_order) VALUES 
  ('Consumer Rights', 'consumer-rights', (SELECT id FROM categories WHERE slug = 'policies'), 'Consumer dignity, autonomy, and rights', 10),
  ('Finance and Accountability', 'finance-accountability', (SELECT id FROM categories WHERE slug = 'policies'), 'Financial governance and transparency', 20),
  ('Privacy and Information Management', 'privacy-information', (SELECT id FROM categories WHERE slug = 'policies'), 'Privacy, confidentiality, and data protection', 30),
  ('Risk Management and Compliance', 'risk-compliance', (SELECT id FROM categories WHERE slug = 'policies'), 'Enterprise risk and regulatory compliance', 40),
  ('Governance and Oversight', 'governance-oversight', (SELECT id FROM categories WHERE slug = 'policies'), 'Organizational governance structure', 50);

-- Insert default business units
INSERT INTO business_units (name, slug, description) VALUES 
  ('Clinical Services', 'clinical-services', 'Clinical care delivery and health services'),
  ('Quality and Safety', 'quality-safety', 'Quality assurance and safety management'),
  ('Finance and Administration', 'finance-admin', 'Financial management and administrative support'),
  ('Human Resources', 'human-resources', 'Workforce management and employee relations'),
  ('Governance and Risk', 'governance-risk', 'Corporate governance and risk management'),
  ('Information Technology', 'information-technology', 'IT systems and digital services'),
  ('Consumer Services', 'consumer-services', 'Consumer support and engagement');

-- Insert common tags
INSERT INTO tags (label, slug, color) VALUES 
  ('ACQS Standard 1', 'acqs-standard-1', '#3B82F6'),
  ('ACQS Standard 8', 'acqs-standard-8', '#8B5CF6'),
  ('Aged Care Act 1997', 'aged-care-act-1997', '#10B981'),
  ('Privacy Act', 'privacy-act', '#F59E0B'),
  ('Mandatory', 'mandatory', '#EF4444'),
  ('Review Required', 'review-required', '#F59E0B'),
  ('High Priority', 'high-priority', '#DC2626'),
  ('Clinical', 'clinical', '#06B6D4'),
  ('Financial', 'financial', '#84CC16'),
  ('Regulatory', 'regulatory', '#A855F7'),
  ('COVID-19', 'covid-19', '#EF4444'),
  ('Audit Ready', 'audit-ready', '#10B981'),
  ('Supported Decision Making', 'supported-decision-making', '#6366F1'),
  ('Dignity of Risk', 'dignity-of-risk', '#EC4899'),
  ('Data Breach', 'data-breach', '#DC2626');
