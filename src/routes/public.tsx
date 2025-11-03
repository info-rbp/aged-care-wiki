import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings } from '../db/schema'
import { getUserFromSession } from '../utils/auth'
import { searchDocuments, getDocumentBySlug, getRelatedDocuments } from '../utils/documents'
import { Layout } from '../components/Layout'
import { DocumentList, DocumentCard } from '../components/DocumentCard'

const publicRoutes = new Hono<{ Bindings: Bindings }>()

// ============================================================================
// CATEGORY PAGES
// ============================================================================

publicRoutes.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug')
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  // Get category
  const category = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE slug = ? AND parent_id IS NULL'
  ).bind(slug).first()

  if (!category) {
    return c.notFound()
  }

  // Get documents in this category
  const documents = await searchDocuments(c.env.DB, {
    category: category.id as number,
    status: 'published',
    limit: 50
  })

  // Get subcategories
  const subcategories = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order'
  ).bind(category.id).all()

  return c.render(
    <Layout user={user} title={category.name as string}>
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm p-6 sticky top-24">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-filter text-blue-600 mr-2"></i>
              Filters
            </h3>

            {subcategories.results.length > 0 && (
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Subcategories</h4>
                <ul class="space-y-2">
                  {subcategories.results.map((sub: any) => (
                    <li>
                      <a href={`/categories/${slug}/${sub.slug}`} class="text-blue-600 hover:text-blue-800 text-sm">
                        {sub.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div class="mb-6">
              <h4 class="text-sm font-semibold text-gray-700 mb-3">Document Type</h4>
              <div class="space-y-2">
                <label class="flex items-center text-sm">
                  <input type="checkbox" class="mr-2" />
                  <span>Policy</span>
                </label>
                <label class="flex items-center text-sm">
                  <input type="checkbox" class="mr-2" />
                  <span>Procedure</span>
                </label>
                <label class="flex items-center text-sm">
                  <input type="checkbox" class="mr-2" />
                  <span>Guideline</span>
                </label>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-gray-700 mb-3">Sort By</h4>
              <select class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option>Recently Updated</option>
                <option>Title A-Z</option>
                <option>Effective Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div class="lg:col-span-3">
          <div class="mb-6">
            <h2 class="text-3xl font-bold text-gray-900 mb-2">{category.name}</h2>
            {category.description && (
              <p class="text-gray-600">{category.description}</p>
            )}
            <p class="text-sm text-gray-500 mt-2">
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <DocumentList 
            documents={documents} 
            emptyMessage={`No ${category.name} found. Check back later.`}
          />
        </div>
      </div>
    </Layout>,
    { title: `${category.name} - Age With Care` }
  )
})

// ============================================================================
// SEARCH PAGE
// ============================================================================

publicRoutes.get('/search', async (c) => {
  const query = c.req.query('q') || ''
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  let results: any[] = []
  if (query) {
    results = await searchDocuments(c.env.DB, {
      query,
      status: 'published',
      limit: 50
    })
  }

  return c.render(
    <Layout user={user} title="Search">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-900 mb-8">Search Documents</h2>

        {/* Search Box */}
        <form action="/search" method="GET" class="mb-8">
          <div class="relative">
            <input
              type="text"
              name="q"
              value={query}
              placeholder="Search policies, procedures, forms..."
              class="w-full px-6 py-4 rounded-lg border border-gray-300 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              class="absolute right-2 top-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <i class="fas fa-search mr-2"></i>
              Search
            </button>
          </div>
        </form>

        {query && (
          <>
            <div class="mb-6">
              <p class="text-gray-600">
                Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for "<strong>{query}</strong>"
              </p>
            </div>

            <DocumentList 
              documents={results}
              emptyMessage="No documents found matching your search. Try different keywords."
            />
          </>
        )}

        {!query && (
          <div class="text-center py-12">
            <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 text-lg">Enter a search term to find documents</p>
            <div class="mt-6">
              <p class="text-sm text-gray-600 mb-3">Popular searches:</p>
              <div class="flex flex-wrap justify-center gap-2">
                <a href="/search?q=consumer+rights" class="badge badge-blue">Consumer Rights</a>
                <a href="/search?q=privacy" class="badge badge-blue">Privacy</a>
                <a href="/search?q=risk+management" class="badge badge-blue">Risk Management</a>
                <a href="/search?q=compliance" class="badge badge-blue">Compliance</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>,
    { title: query ? `Search: ${query}` : 'Search' }
  )
})

// ============================================================================
// DOCUMENT DETAIL PAGE
// ============================================================================

publicRoutes.get('/documents/:slug', async (c) => {
  const slug = c.req.param('slug')
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  const doc = await getDocumentBySlug(c.env.DB, slug)

  if (!doc || (doc.status !== 'published' && !user)) {
    return c.notFound()
  }

  // Get related documents
  const related = await getRelatedDocuments(c.env.DB, doc.id)

  // Record view
  if (user) {
    await c.env.DB.prepare(
      'INSERT INTO document_views (document_id, user_id) VALUES (?, ?)'
    ).bind(doc.id, user.id).run()
  }

  return c.render(
    <Layout user={user} title={doc.title}>
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div class="lg:col-span-3">
          <div class="document-viewer">
            <div class="document-viewer-header">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">{doc.title}</h1>
                  <div class="flex items-center space-x-4 text-sm text-gray-600">
                    <span class={`badge status-${doc.status}`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                    <span>
                      <i class="fas fa-folder text-gray-400 mr-1"></i>
                      {doc.category_name}
                    </span>
                    <span>
                      <i class="fas fa-calendar text-gray-400 mr-1"></i>
                      {new Date(doc.effective_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  {user && (
                    <button class="btn-secondary text-sm">
                      <i class="fas fa-bookmark mr-1"></i>
                      Bookmark
                    </button>
                  )}
                  {doc.download_allowed && (
                    <button class="btn-primary text-sm">
                      <i class="fas fa-download mr-1"></i>
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div class="document-viewer-content">
              {doc.summary && (
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p class="text-gray-700">{doc.summary}</p>
                </div>
              )}

              <div class="prose max-w-none">
                <p class="text-gray-600">
                  <em>Document content will be rendered here based on file type.</em>
                </p>
                <p class="text-gray-600 mt-4">
                  This document is a <strong>{doc.content_type}</strong> file stored as <strong>{doc.file_type}</strong>.
                </p>
                {doc.search_content && (
                  <div class="mt-6">
                    <h2>Content Preview</h2>
                    <p>{doc.search_content.substring(0, 500)}...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div class="lg:col-span-1">
          <div class="space-y-6">
            {/* Document Info */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
              <dl class="space-y-3 text-sm">
                <div>
                  <dt class="text-gray-600">Owner</dt>
                  <dd class="text-gray-900 font-medium">{doc.owner_name}</dd>
                </div>
                {doc.reviewer_name && (
                  <div>
                    <dt class="text-gray-600">Reviewer</dt>
                    <dd class="text-gray-900 font-medium">{doc.reviewer_name}</dd>
                  </div>
                )}
                <div>
                  <dt class="text-gray-600">Effective Date</dt>
                  <dd class="text-gray-900 font-medium">
                    {new Date(doc.effective_date).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt class="text-gray-600">Review Due</dt>
                  <dd class="text-gray-900 font-medium">
                    {new Date(doc.review_due).toLocaleDateString()}
                  </dd>
                </div>
                {doc.business_unit_name && (
                  <div>
                    <dt class="text-gray-600">Business Unit</dt>
                    <dd class="text-gray-900 font-medium">{doc.business_unit_name}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div class="flex flex-wrap gap-2">
                  {doc.tags.map((tag: any) => (
                    <a 
                      href={`/tags/${tag.slug}`}
                      class="badge badge-blue"
                      style={`background-color: ${tag.color}20; color: ${tag.color}`}
                    >
                      {tag.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related Documents */}
            {related.length > 0 && (
              <div class="bg-white rounded-lg shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Related Documents</h3>
                <ul class="space-y-2 text-sm">
                  {related.map((rel: any) => (
                    <li>
                      <a href={`/documents/${rel.slug}`} class="text-blue-600 hover:text-blue-800">
                        {rel.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>,
    { title: doc.title }
  )
})

// ============================================================================
// RECENT & BOOKMARKS
// ============================================================================

publicRoutes.get('/recent', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  const documents = await searchDocuments(c.env.DB, {
    status: 'published',
    sortBy: 'date',
    limit: 20
  })

  return c.render(
    <Layout user={user} title="Recently Updated">
      <h2 class="text-3xl font-bold text-gray-900 mb-8">Recently Updated Documents</h2>
      <DocumentList 
        documents={documents}
        emptyMessage="No recent documents found."
      />
    </Layout>,
    { title: 'Recently Updated' }
  )
})

publicRoutes.get('/bookmarks', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  if (!user) {
    return c.redirect('/login')
  }

  const bookmarks = await c.env.DB.prepare(`
    SELECT d.*, c.name as category_name, u.name as owner_name
    FROM documents d
    JOIN bookmarks b ON d.id = b.document_id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).bind(user.id).all()

  return c.render(
    <Layout user={user} title="My Bookmarks">
      <h2 class="text-3xl font-bold text-gray-900 mb-8">My Bookmarks</h2>
      <DocumentList 
        documents={bookmarks.results}
        emptyMessage="You haven't bookmarked any documents yet."
      />
    </Layout>,
    { title: 'My Bookmarks' }
  )
})

// Tags page
publicRoutes.get('/tags/:slug', async (c) => {
  const slug = c.req.param('slug')
  const sessionId = getCookie(c, 'session_id')
  const user = sessionId ? await getUserFromSession(c.env.DB, sessionId) : null

  const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).first()

  if (!tag) {
    return c.notFound()
  }

  const documents = await c.env.DB.prepare(`
    SELECT d.*, c.name as category_name, u.name as owner_name
    FROM documents d
    JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE dt.tag_id = ? AND d.status = 'published'
    ORDER BY d.updated_at DESC
  `).bind(tag.id).all()

  return c.render(
    <Layout user={user} title={`Tag: ${tag.label}`}>
      <div class="mb-8">
        <span 
          class="badge badge-blue text-lg px-4 py-2"
          style={`background-color: ${tag.color}20; color: ${tag.color}`}
        >
          {tag.label}
        </span>
        <h2 class="text-3xl font-bold text-gray-900 mt-4">
          Documents tagged with "{tag.label}"
        </h2>
      </div>
      <DocumentList 
        documents={documents.results}
        emptyMessage={`No documents found with tag "${tag.label}".`}
      />
    </Layout>,
    { title: `Tag: ${tag.label}` }
  )
})

export default publicRoutes
