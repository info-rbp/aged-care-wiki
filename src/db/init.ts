import type { Bindings } from './schema';

// Check if user table exists
export async function isDatabaseInitialized(db: D1Database): Promise<boolean> {
  try {
    const result = await db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="users"').first();
    return !!result;
  } catch {
    return false;
  }
}

// Initialize database with schema
export async function initDatabase(db: D1Database) {
  try {
    const initialized = await isDatabaseInitialized(db);
    if (initialized) {
      return { success: true, message: 'Database already initialized' };
    }

    console.log('Initializing database schema...');

    // Create tables - execute in batches
    const batch = [
      // Users table
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )`),
      db.prepare(`CREATE INDEX idx_users_email ON users(email)`),
      db.prepare(`CREATE INDEX idx_users_status ON users(status)`),

      // Roles table
      db.prepare(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),

      // User roles
      db.prepare(`CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )`),

      // Categories
      db.prepare(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      )`),
      db.prepare(`CREATE INDEX idx_categories_parent ON categories(parent_id)`),
      db.prepare(`CREATE INDEX idx_categories_slug ON categories(slug)`),

      // Business units
      db.prepare(`CREATE TABLE IF NOT EXISTS business_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),

      // Tags
      db.prepare(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE INDEX idx_tags_label ON tags(label)`),

      // Documents - main table
      db.prepare(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        summary TEXT,
        content_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        file_type TEXT NOT NULL,
        mime_type TEXT,
        owner_id INTEGER NOT NULL,
        reviewer_id INTEGER,
        approver_id INTEGER,
        effective_date DATE NOT NULL,
        review_due DATE NOT NULL,
        published_at DATETIME,
        archived_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        category_id INTEGER NOT NULL,
        subcategory_id INTEGER,
        business_unit_id INTEGER,
        external_reference TEXT,
        jurisdiction TEXT,
        standard_alignment TEXT,
        download_allowed BOOLEAN DEFAULT 1,
        public_access BOOLEAN DEFAULT 0,
        search_content TEXT,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (business_unit_id) REFERENCES business_units(id)
      )`),
      db.prepare(`CREATE INDEX idx_documents_slug ON documents(slug)`),
      db.prepare(`CREATE INDEX idx_documents_status ON documents(status)`),
      db.prepare(`CREATE INDEX idx_documents_content_type ON documents(content_type)`),

      // Document versions
      db.prepare(`CREATE TABLE IF NOT EXISTS document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        file_key TEXT NOT NULL,
        file_size INTEGER,
        checksum TEXT NOT NULL,
        uploader_id INTEGER NOT NULL,
        change_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_current BOOLEAN DEFAULT 0,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        UNIQUE(document_id, version_number)
      )`),
      db.prepare(`CREATE INDEX idx_versions_document ON document_versions(document_id)`),

      // Document tags
      db.prepare(`CREATE TABLE IF NOT EXISTS document_tags (
        document_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (document_id, tag_id),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`),

      // Collections
      db.prepare(`CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'private',
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )`),

      // Audit logs
      db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id INTEGER,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id INTEGER,
        changes TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_id) REFERENCES users(id)
      )`),
      db.prepare(`CREATE INDEX idx_audit_actor ON audit_logs(actor_id)`),

      // Sessions
      db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`),
      db.prepare(`CREATE INDEX idx_sessions_user ON sessions(user_id)`),

      // Bookmarks
      db.prepare(`CREATE TABLE IF NOT EXISTS bookmarks (
        user_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, document_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`)
    ];

    await db.batch(batch);

    console.log('Database schema created successfully');
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Seed initial data
export async function seedDatabase(db: D1Database) {
  try {
    // Check if already seeded
    const existingRole = await db.prepare('SELECT id FROM roles LIMIT 1').first();
    if (existingRole) {
      return { success: true, message: 'Database already seeded' };
    }

    console.log('Seeding database...');

    await db.batch([
      // Insert roles
      db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`)
        .bind('reader', 'Views published content', '["read_published","download_allowed","create_bookmarks"]'),
      db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`)
        .bind('contributor', 'Uploads and edits content', '["read_published","read_draft","upload","edit_metadata","submit_approval"]'),
      db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`)
        .bind('approver', 'Reviews and publishes content', '["read_published","read_draft","upload","edit_metadata","approve","reject","archive"]'),
      db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`)
        .bind('administrator', 'Full administrative access', '["read_published","read_draft","upload","approve","manage_users","manage_roles","view_analytics"]'),
      db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`)
        .bind('system_owner', 'Complete system control', '["*"]'),

      // Insert admin user (password: Admin123!)
      db.prepare(`INSERT INTO users (email, name, password_hash, status) VALUES (?, ?, ?, ?)`)
        .bind('admin@agewithcare.com', 'System Administrator', '$2a$10$SZE7geMOPiGjlAIBCEdNsOOR6sfFcMG1s.1DCo3o8DzQdDRYTF7nC', 'active'),

      // Insert categories
      db.prepare(`INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)`)
        .bind('Policies', 'policies', 'Organizational policies and governance documents', 10),
      db.prepare(`INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)`)
        .bind('Procedures', 'procedures', 'Standard operating procedures', 20),
      db.prepare(`INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)`)
        .bind('Forms', 'forms', 'Templates and forms', 30),
      db.prepare(`INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)`)
        .bind('Guidelines', 'guidelines', 'Best practice guidelines', 40),

      // Insert business units
      db.prepare(`INSERT INTO business_units (name, slug, description) VALUES (?, ?, ?)`)
        .bind('Clinical Services', 'clinical-services', 'Clinical care delivery'),
      db.prepare(`INSERT INTO business_units (name, slug, description) VALUES (?, ?, ?)`)
        .bind('Quality and Safety', 'quality-safety', 'Quality assurance'),
      db.prepare(`INSERT INTO business_units (name, slug, description) VALUES (?, ?, ?)`)
        .bind('Governance and Risk', 'governance-risk', 'Corporate governance'),

      // Insert tags
      db.prepare(`INSERT INTO tags (label, slug, color) VALUES (?, ?, ?)`)
        .bind('ACQS Standard 1', 'acqs-standard-1', '#3B82F6'),
      db.prepare(`INSERT INTO tags (label, slug, color) VALUES (?, ?, ?)`)
        .bind('ACQS Standard 8', 'acqs-standard-8', '#8B5CF6'),
      db.prepare(`INSERT INTO tags (label, slug, color) VALUES (?, ?, ?)`)
        .bind('Mandatory', 'mandatory', '#EF4444'),
      db.prepare(`INSERT INTO tags (label, slug, color) VALUES (?, ?, ?)`)
        .bind('Regulatory', 'regulatory', '#A855F7')
    ]);

    // Assign system_owner role to admin (need to get IDs first)
    const admin = await db.prepare('SELECT id FROM users WHERE email = ?').bind('admin@agewithcare.com').first();
    const sysOwnerRole = await db.prepare('SELECT id FROM roles WHERE name = ?').bind('system_owner').first();
    
    if (admin && sysOwnerRole) {
      await db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)')
        .bind(admin.id, sysOwnerRole.id)
        .run();
    }

    console.log('Database seeded successfully');
    return { success: true, message: 'Database seeded successfully' };
  } catch (error) {
    console.error('Database seeding error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
