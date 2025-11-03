import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings } from '../db/schema'
import { getUserFromSession, getUserPermissions, hasPermission } from '../utils/auth'
import { Layout } from '../components/Layout'

const adminRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware to check authentication
adminRoutes.use('*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  if (!user) {
    return c.redirect('/login')
  }

  c.set('user', user)
  await next()
})

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

adminRoutes.get('/', async (c) => {
  const user = c.get('user')
  const permissions = await getUserPermissions(c.env.DB, user.id)
  
  const isAdmin = permissions.includes('*') || permissions.includes('manage_users')

  if (!isAdmin && !permissions.includes('upload')) {
    return c.redirect('/')
  }

  // Get stats
  const stats = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ?').bind('published').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ?').bind('pending_review').first(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM documents WHERE status = ? OR review_due < date("now")').bind('expired').first()
  ])

  const totalDocs = stats[0]?.count || 0
  const published = stats[1]?.count || 0
  const pending = stats[2]?.count || 0
  const expired = stats[3]?.count || 0

  // Recent activity
  const recentDocs = await c.env.DB.prepare(`
    SELECT d.*, c.name as category_name, u.name as owner_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.owner_id = u.id
    ORDER BY d.updated_at DESC
    LIMIT 10
  `).all()

  return c.render(
    <Layout user={user} title="Admin Portal">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-gray-900">
          <i class="fas fa-cog text-blue-600 mr-2"></i>
          Admin Portal
        </h2>
        <p class="text-gray-600 mt-2">Manage documents, users, and system settings</p>
      </div>

      {/* Quick Actions */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <a href="/admin/upload" class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <div class="flex items-center space-x-4">
            <div class="bg-blue-100 rounded-lg p-3">
              <i class="fas fa-upload text-2xl text-blue-600"></i>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Upload Documents</h3>
              <p class="text-sm text-gray-600">Add new policies and procedures</p>
            </div>
          </div>
        </a>

        {permissions.includes('approve') || permissions.includes('*') ? (
          <a href="/admin/approvals" class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <div class="flex items-center space-x-4">
              <div class="bg-green-100 rounded-lg p-3">
                <i class="fas fa-tasks text-2xl text-green-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <p class="text-sm text-gray-600">Review and approve documents</p>
                {pending > 0 && (
                  <span class="badge badge-red text-xs">{pending} pending</span>
                )}
              </div>
            </div>
          </a>
        ) : null}

        {isAdmin && (
          <a href="/admin/users" class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <div class="flex items-center space-x-4">
              <div class="bg-purple-100 rounded-lg p-3">
                <i class="fas fa-users text-2xl text-purple-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">User Management</h3>
                <p class="text-sm text-gray-600">Manage users and permissions</p>
              </div>
            </div>
          </a>
        )}
      </div>

      {/* Stats */}
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-3xl font-bold text-blue-600">{totalDocs}</div>
            <div class="text-sm text-gray-600 mt-1">Total Documents</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-3xl font-bold text-green-600">{published}</div>
            <div class="text-sm text-gray-600 mt-1">Published</div>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <div class="text-3xl font-bold text-yellow-600">{pending}</div>
            <div class="text-sm text-gray-600 mt-1">Pending Review</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-3xl font-bold text-red-600">{expired}</div>
            <div class="text-sm text-gray-600 mt-1">Expired/Due</div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.results.length === 0 ? (
                <tr>
                  <td colspan="6" class="text-center py-8 text-gray-500">
                    No documents yet. <a href="/admin/upload" class="text-blue-600">Upload your first document</a>
                  </td>
                </tr>
              ) : (
                recentDocs.results.map((doc: any) => (
                  <tr>
                    <td>
                      <a href={`/documents/${doc.slug}`} class="text-blue-600 hover:text-blue-800 font-medium">
                        {doc.title}
                      </a>
                    </td>
                    <td>{doc.category_name}</td>
                    <td>{doc.owner_name}</td>
                    <td>
                      <span class={`badge status-${doc.status}`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(doc.updated_at).toLocaleDateString()}</td>
                    <td>
                      <a href={`/admin/documents/${doc.id}/edit`} class="text-blue-600 hover:text-blue-800 text-sm">
                        <i class="fas fa-edit"></i> Edit
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>,
    { title: 'Admin Portal - Age With Care' }
  )
})

// ============================================================================
// UPLOAD DOCUMENT
// ============================================================================

adminRoutes.get('/upload', async (c) => {
  const user = c.get('user')
  
  // Get categories and business units for form
  const categories = await c.env.DB.prepare('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order').all()
  const businessUnits = await c.env.DB.prepare('SELECT * FROM business_units ORDER BY name').all()
  const tags = await c.env.DB.prepare('SELECT * FROM tags ORDER BY label').all()
  const users = await c.env.DB.prepare('SELECT id, name, email FROM users WHERE status = ? ORDER BY name').bind('active').all()

  return c.render(
    <Layout user={user} title="Upload Document">
      <div class="max-w-4xl">
        <h2 class="text-3xl font-bold text-gray-900 mb-8">
          <i class="fas fa-upload text-blue-600 mr-2"></i>
          Upload New Document
        </h2>

        <div class="bg-white rounded-lg shadow-sm p-8">
          <form action="/api/admin/documents" method="POST" enctype="multipart/form-data" class="space-y-6">
            {/* File Upload */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Document File <span class="text-red-500">*</span>
              </label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-600 mb-2">Drag and drop file here, or click to browse</p>
                <input type="file" name="file" required class="hidden" id="file-upload" />
                <label for="file-upload" class="btn-primary cursor-pointer">
                  <i class="fas fa-folder-open mr-2"></i>
                  Choose File
                </label>
                <p class="text-xs text-gray-500 mt-3">
                  Supported: PDF, DOCX, XLSX, CSV, PPTX, HTML, Markdown, Images (Max 50MB)
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Title <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Consumer Rights and Dignity Policy"
                />
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Summary
                </label>
                <textarea
                  name="summary"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the document..."
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Content Type <span class="text-red-500">*</span>
                </label>
                <select name="content_type" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select type...</option>
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                  <option value="work_instruction">Work Instruction</option>
                  <option value="form">Form</option>
                  <option value="template">Template</option>
                  <option value="guideline">Guideline</option>
                  <option value="register">Register</option>
                  <option value="checklist">Checklist</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Category <span class="text-red-500">*</span>
                </label>
                <select name="category_id" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select category...</option>
                  {categories.results.map((cat: any) => (
                    <option value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Business Unit
                </label>
                <select name="business_unit_id" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select business unit...</option>
                  {businessUnits.results.map((bu: any) => (
                    <option value={bu.id}>{bu.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Owner <span class="text-red-500">*</span>
                </label>
                <select name="owner_id" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value={user.id} selected>{user.name} (You)</option>
                  {users.results.filter((u: any) => u.id !== user.id).map((u: any) => (
                    <option value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Reviewer
                </label>
                <select name="reviewer_id" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Select reviewer...</option>
                  {users.results.map((u: any) => (
                    <option value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date <span class="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effective_date"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Review Due Date <span class="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="review_due"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div class="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {tags.results.map((tag: any) => (
                    <label class="flex items-center space-x-2">
                      <input type="checkbox" name="tags[]" value={tag.id} class="rounded" />
                      <span class="text-sm" style={`color: ${tag.color}`}>{tag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div class="border-t pt-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              <div class="space-y-3">
                <label class="flex items-center space-x-2">
                  <input type="checkbox" name="download_allowed" value="1" checked class="rounded" />
                  <span class="text-sm text-gray-700">Allow downloads</span>
                </label>
                <label class="flex items-center space-x-2">
                  <input type="checkbox" name="public_access" value="1" class="rounded" />
                  <span class="text-sm text-gray-700">Public access (no login required)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div class="flex items-center justify-between pt-6 border-t">
              <a href="/admin" class="text-gray-600 hover:text-gray-900">
                <i class="fas fa-arrow-left mr-2"></i>
                Cancel
              </a>
              <div class="flex items-center space-x-3">
                <button type="submit" name="action" value="draft" class="btn-secondary">
                  <i class="fas fa-save mr-2"></i>
                  Save as Draft
                </button>
                <button type="submit" name="action" value="publish" class="btn-primary">
                  <i class="fas fa-check mr-2"></i>
                  Save & Publish
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>,
    { title: 'Upload Document - Admin' }
  )
})

// ============================================================================
// PENDING APPROVALS
// ============================================================================

adminRoutes.get('/approvals', async (c) => {
  const user = c.get('user')
  const permissions = await getUserPermissions(c.env.DB, user.id)
  
  if (!permissions.includes('approve') && !permissions.includes('*')) {
    return c.redirect('/admin')
  }

  const pendingDocs = await c.env.DB.prepare(`
    SELECT d.*, c.name as category_name, u.name as owner_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE d.status = 'pending_review'
    ORDER BY d.updated_at DESC
  `).all()

  return c.render(
    <Layout user={user} title="Pending Approvals">
      <h2 class="text-3xl font-bold text-gray-900 mb-8">
        <i class="fas fa-tasks text-green-600 mr-2"></i>
        Pending Approvals
      </h2>

      {pendingDocs.results.length === 0 ? (
        <div class="text-center py-12 bg-white rounded-lg shadow-sm">
          <i class="fas fa-check-circle text-6xl text-green-300 mb-4"></i>
          <p class="text-gray-500 text-lg">No documents pending approval</p>
          <p class="text-gray-400 text-sm mt-2">All caught up!</p>
        </div>
      ) : (
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDocs.results.map((doc: any) => (
                <tr>
                  <td>
                    <a href={`/documents/${doc.slug}`} class="text-blue-600 hover:text-blue-800 font-medium">
                      {doc.title}
                    </a>
                  </td>
                  <td>{doc.category_name}</td>
                  <td>{doc.owner_name}</td>
                  <td>{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div class="flex items-center space-x-2">
                      <button class="text-green-600 hover:text-green-800 text-sm">
                        <i class="fas fa-check"></i> Approve
                      </button>
                      <button class="text-red-600 hover:text-red-800 text-sm">
                        <i class="fas fa-times"></i> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>,
    { title: 'Pending Approvals - Admin' }
  )
})

// ============================================================================
// USER MANAGEMENT
// ============================================================================

adminRoutes.get('/users', async (c) => {
  const user = c.get('user')
  const permissions = await getUserPermissions(c.env.DB, user.id)
  
  if (!permissions.includes('manage_users') && !permissions.includes('*')) {
    return c.redirect('/admin')
  }

  const allUsers = await c.env.DB.prepare(`
    SELECT u.*, 
      GROUP_CONCAT(r.name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all()

  return c.render(
    <Layout user={user} title="User Management">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-3xl font-bold text-gray-900">
          <i class="fas fa-users text-purple-600 mr-2"></i>
          User Management
        </h2>
        <button class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Add New User
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.results.map((u: any) => (
              <tr>
                <td class="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span class="badge badge-blue text-xs">
                    {u.roles || 'No roles'}
                  </span>
                </td>
                <td>
                  <span class={`badge ${u.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  {u.last_login_at 
                    ? new Date(u.last_login_at).toLocaleDateString()
                    : 'Never'
                  }
                </td>
                <td>
                  <button class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-edit"></i> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>,
    { title: 'User Management - Admin' }
  )
})

export default adminRoutes
