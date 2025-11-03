import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { renderer } from './renderer'
import type { Bindings } from './db/schema'
import { initDatabase, seedDatabase, isDatabaseInitialized } from './db/init'
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  getUserFromSession,
  deleteSession,
  getCurrentUser,
  getUserPermissions,
  logAudit
} from './utils/auth'
import {
  generateSlug,
  ensureUniqueSlug,
  searchDocuments,
  getDocumentBySlug,
  getRelatedDocuments,
  getDocumentVersions,
  getDocumentsRequiringReview,
  detectFileType,
  autoClassifyContentType,
  calculateChecksum,
  storeFile
} from './utils/documents'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Use renderer for HTML pages
app.use('*', renderer)

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

// Initialize database on first request
let dbInitialized = false

app.use('*', async (c, next) => {
  if (!dbInitialized) {
    const initialized = await isDatabaseInitialized(c.env.DB)
    if (!initialized) {
      console.log('Database not initialized, running setup...')
      await initDatabase(c.env.DB)
      await seedDatabase(c.env.DB)
    }
    dbInitialized = true
  }
  await next()
})

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Home page
app.get('/', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  return c.render(
    <div class="min-h-screen">
      {/* Header */}
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <i class="fas fa-book-medical text-3xl text-blue-600"></i>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Age With Care</h1>
                <p class="text-sm text-gray-500">Policy & Procedure Wiki</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              {user ? (
                <>
                  <span class="text-gray-700">Welcome, {user.name}</span>
                  <a href="/admin" class="btn-primary">Admin Portal</a>
                  <a href="/api/auth/logout" class="text-gray-600 hover:text-gray-900">Logout</a>
                </>
              ) : (
                <a href="/login" class="btn-primary">Login</a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="text-4xl font-bold mb-4">Welcome to the Policy Wiki</h2>
          <p class="text-xl mb-8">
            Access comprehensive policies, procedures, and guidelines for Age With Care
          </p>

          {/* Search Box */}
          <div class="max-w-2xl">
            <form action="/search" method="GET" class="relative">
              <input
                type="text"
                name="q"
                placeholder="Search policies, procedures, forms..."
                class="w-full px-6 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                class="absolute right-2 top-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <i class="fas fa-search"></i> Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Category Cards */}
          <a href="/categories/policies" class="category-card">
            <i class="fas fa-file-alt text-4xl text-blue-600 mb-3"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Policies</h3>
            <p class="text-gray-600">Organizational policies and governance documents</p>
          </a>

          <a href="/categories/procedures" class="category-card">
            <i class="fas fa-clipboard-list text-4xl text-green-600 mb-3"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Procedures</h3>
            <p class="text-gray-600">Standard operating procedures and work instructions</p>
          </a>

          <a href="/categories/forms" class="category-card">
            <i class="fas fa-file-invoice text-4xl text-purple-600 mb-3"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Forms</h3>
            <p class="text-gray-600">Templates and forms for operational use</p>
          </a>

          <a href="/categories/guidelines" class="category-card">
            <i class="fas fa-book text-4xl text-orange-600 mb-3"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Guidelines</h3>
            <p class="text-gray-600">Best practice guidelines and recommendations</p>
          </a>
        </div>

        {/* Quick Links */}
        <div class="mt-12">
          <h3 class="text-2xl font-bold text-gray-900 mb-6">Quick Links</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-3">
                <i class="fas fa-star text-yellow-500 mr-2"></i>
                Recently Updated
              </h4>
              <p class="text-gray-600 text-sm">View the latest policy updates and revisions</p>
              <a href="/recent" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                View all <i class="fas fa-arrow-right ml-1"></i>
              </a>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-3">
                <i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>
                Mandatory Policies
              </h4>
              <p class="text-gray-600 text-sm">Essential policies all staff must review</p>
              <a href="/tags/mandatory" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                View all <i class="fas fa-arrow-right ml-1"></i>
              </a>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-3">
                <i class="fas fa-bookmark text-blue-500 mr-2"></i>
                My Bookmarks
              </h4>
              <p class="text-gray-600 text-sm">Quick access to your saved documents</p>
              {user ? (
                <a href="/bookmarks" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">
                  View all <i class="fas fa-arrow-right ml-1"></i>
                </a>
              ) : (
                <p class="text-gray-500 text-sm mt-2">Login to access bookmarks</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer class="bg-gray-800 text-white mt-16 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 class="text-lg font-semibold mb-4">Age With Care</h4>
              <p class="text-gray-300 text-sm">
                Providing quality aged care services with dignity and respect.
              </p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-4">Quick Links</h4>
              <ul class="space-y-2 text-sm">
                <li><a href="/about" class="text-gray-300 hover:text-white">About Us</a></li>
                <li><a href="/contact" class="text-gray-300 hover:text-white">Contact</a></li>
                <li><a href="/help" class="text-gray-300 hover:text-white">Help</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-4">Compliance</h4>
              <ul class="space-y-2 text-sm">
                <li><a href="/privacy" class="text-gray-300 hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" class="text-gray-300 hover:text-white">Terms of Use</a></li>
                <li><a href="/accessibility" class="text-gray-300 hover:text-white">Accessibility</a></li>
              </ul>
            </div>
          </div>
          <div class="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            <p>&copy; 2025 Age With Care. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>,
    { title: 'Age With Care - Policy Wiki' }
  )
})

// Login page
app.get('/login', (c) => {
  return c.render(
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div class="text-center mb-8">
          <i class="fas fa-book-medical text-5xl text-blue-600 mb-4"></i>
          <h2 class="text-3xl font-bold text-gray-900">Login</h2>
          <p class="text-gray-600 mt-2">Access the Policy Wiki</p>
        </div>

        <form action="/api/auth/login" method="POST" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium"
          >
            <i class="fas fa-sign-in-alt mr-2"></i>
            Login
          </button>
        </form>

        <div class="mt-6 text-center">
          <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">
            <i class="fas fa-arrow-left mr-1"></i>
            Back to Home
          </a>
        </div>

        <div class="mt-8 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-gray-700">
            <strong>Demo Credentials:</strong><br />
            Email: admin@agewithcare.com<br />
            Password: Admin123!
          </p>
        </div>
      </div>
    </div>,
    { title: 'Login - Age With Care' }
  )
})

// Admin portal (placeholder)
app.get('/admin', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  if (!user) {
    return c.redirect('/login')
  }

  const permissions = await getUserPermissions(c.env.DB, user.id)
  const isAdmin = permissions.includes('*') || permissions.includes('manage_users')

  if (!isAdmin) {
    return c.redirect('/')
  }

  return c.render(
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">
              <i class="fas fa-cog text-blue-600 mr-2"></i>
              Admin Portal
            </h1>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">{user.name}</span>
              <a href="/" class="text-blue-600 hover:text-blue-800">View Wiki</a>
              <a href="/api/auth/logout" class="text-gray-600 hover:text-gray-900">Logout</a>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-upload text-blue-600 mr-2"></i>
              Upload Documents
            </h3>
            <p class="text-gray-600 text-sm mb-4">Upload new policies and procedures</p>
            <a href="/admin/upload" class="btn-primary inline-block">
              <i class="fas fa-plus mr-2"></i>
              Upload New
            </a>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-tasks text-green-600 mr-2"></i>
              Pending Approvals
            </h3>
            <p class="text-gray-600 text-sm mb-4">Review and approve pending documents</p>
            <a href="/admin/approvals" class="btn-secondary inline-block">
              View Approvals
            </a>
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-users text-purple-600 mr-2"></i>
              User Management
            </h3>
            <p class="text-gray-600 text-sm mb-4">Manage users and permissions</p>
            <a href="/admin/users" class="btn-secondary inline-block">
              Manage Users
            </a>
          </div>
        </div>

        <div class="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-3xl font-bold text-blue-600">--</div>
              <div class="text-sm text-gray-600 mt-1">Total Documents</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-3xl font-bold text-green-600">--</div>
              <div class="text-sm text-gray-600 mt-1">Published</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-3xl font-bold text-yellow-600">--</div>
              <div class="text-sm text-gray-600 mt-1">Pending Review</div>
            </div>
            <div class="text-center p-4 bg-red-50 rounded-lg">
              <div class="text-3xl font-bold text-red-600">--</div>
              <div class="text-sm text-gray-600 mt-1">Expired</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    { title: 'Admin Portal - Age With Care' }
  )
})

// ============================================================================
// API ROUTES - Authentication
// ============================================================================

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body.email as string
    const password = body.password as string

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    // Get user
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND status = ?'
    ).bind(email, 'active').first()

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash as string)
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Create session
    const sessionId = await createSession(c.env.DB, user.id as number)

    // Update last login
    await c.env.DB.prepare(
      'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
    ).bind(user.id).run()

    // Log audit
    await logAudit(
      c.env.DB,
      user.id as number,
      'login',
      'user',
      user.id as number,
      { success: true },
      c.req.header('CF-Connecting-IP') || 'unknown',
      c.req.header('User-Agent') || 'unknown'
    )

    // Set cookie and redirect
    setCookie(c, 'session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 3600
    })
    return c.redirect('/')
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Logout
app.get('/api/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  
  if (sessionId) {
    await deleteSession(c.env.DB, sessionId)
  }

  deleteCookie(c, 'session_id', { path: '/' })
  return c.redirect('/')
})

// Get current user
app.get('/api/auth/me', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const permissions = await getUserPermissions(c.env.DB, user.id)

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    permissions
  })
})

// ============================================================================
// API ROUTES - Search
// ============================================================================

app.get('/api/search', async (c) => {
  const query = c.req.query('q')
  const contentType = c.req.query('type')
  const category = c.req.query('category')
  const status = c.req.query('status') || 'published'
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  const results = await searchDocuments(c.env.DB, {
    query,
    contentType,
    category: category ? parseInt(category) : undefined,
    status,
    limit,
    offset
  })

  return c.json({
    results,
    total: results.length,
    limit,
    offset
  })
})

// ============================================================================
// API ROUTES - Database Admin
// ============================================================================

app.get('/api/admin/db/init', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const initResult = await initDatabase(c.env.DB)
  const seedResult = await seedDatabase(c.env.DB)

  return c.json({
    init: initResult,
    seed: seedResult
  })
})

// Check database status
app.get('/api/admin/db/status', async (c) => {
  const initialized = await isDatabaseInitialized(c.env.DB)
  
  if (initialized) {
    // Get some stats
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
    const docCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first()
    const categoryCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM categories').first()

    return c.json({
      initialized: true,
      stats: {
        users: userCount?.count || 0,
        documents: docCount?.count || 0,
        categories: categoryCount?.count || 0
      }
    })
  }

  return c.json({ initialized: false })
})

export default app
