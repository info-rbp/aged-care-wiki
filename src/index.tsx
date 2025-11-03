import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { renderer } from './renderer'
import type { Bindings } from './db/schema'
import { initDatabase, seedDatabase, isDatabaseInitialized } from './db/init'
import { 
  verifyPassword, 
  createSession, 
  getUserFromSession,
  deleteSession,
  logAudit
} from './utils/auth'
import { Layout } from './components/Layout'
import publicRoutes from './routes/public'
import adminRoutes from './routes/admin'

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
// HOME PAGE
// ============================================================================

app.get('/', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  return c.render(
    <Layout user={user}>
      {/* Hero Section */}
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 rounded-lg -mt-8 mb-8">
        <div class="max-w-4xl mx-auto px-4">
          <h2 class="text-4xl font-bold mb-4">Welcome to the Policy Wiki</h2>
          <p class="text-xl mb-8">
            Access comprehensive policies, procedures, and guidelines for Age With Care
          </p>

          {/* Search Box */}
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

      {/* Category Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
    </Layout>,
    { title: 'Age With Care - Policy Wiki' }
  )
})

// ============================================================================
// LOGIN PAGE
// ============================================================================

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

// ============================================================================
// API ROUTES - Authentication
// ============================================================================

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body.email as string
    const password = body.password as string

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND status = ?'
    ).bind(email, 'active').first()

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const validPassword = await verifyPassword(password, user.password_hash as string)
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const sessionId = await createSession(c.env.DB, user.id as number)

    await c.env.DB.prepare(
      'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
    ).bind(user.id).run()

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

app.get('/api/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  
  if (sessionId) {
    await deleteSession(c.env.DB, sessionId)
  }

  deleteCookie(c, 'session_id', { path: '/' })
  return c.redirect('/')
})

// ============================================================================
// API ROUTES - Admin
// ============================================================================

app.get('/api/admin/db/status', async (c) => {
  const initialized = await isDatabaseInitialized(c.env.DB)
  
  if (initialized) {
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

// ============================================================================
// MOUNT ROUTES
// ============================================================================

app.route('/', publicRoutes)
app.route('/admin', adminRoutes)

export default app
