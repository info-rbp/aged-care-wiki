export function DocumentCard({ doc }: { doc: any }) {
  const statusColors: Record<string, string> = {
    draft: 'badge-gray',
    pending_review: 'badge-yellow',
    approved: 'badge-blue',
    published: 'badge-green',
    archived: 'badge-gray',
    expired: 'badge-red'
  }

  const contentTypeIcons: Record<string, string> = {
    policy: 'fa-file-alt',
    procedure: 'fa-clipboard-list',
    work_instruction: 'fa-list-ol',
    form: 'fa-file-invoice',
    template: 'fa-file-code',
    guideline: 'fa-book',
    register: 'fa-table',
    checklist: 'fa-check-square',
    faq: 'fa-question-circle'
  }

  return (
    <a href={`/documents/${doc.slug}`} class="document-card block">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center space-x-2">
          <i class={`fas ${contentTypeIcons[doc.content_type] || 'fa-file'} text-blue-600`}></i>
          <h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600">
            {doc.title}
          </h3>
        </div>
        <span class={`badge ${statusColors[doc.status]}`}>
          {doc.status.replace('_', ' ')}
        </span>
      </div>

      {doc.summary && (
        <p class="text-gray-600 text-sm mb-3 line-clamp-2">
          {doc.summary}
        </p>
      )}

      <div class="flex items-center justify-between text-sm text-gray-500">
        <div class="flex items-center space-x-4">
          {doc.category_name && (
            <span>
              <i class="fas fa-folder text-gray-400 mr-1"></i>
              {doc.category_name}
            </span>
          )}
          {doc.owner_name && (
            <span>
              <i class="fas fa-user text-gray-400 mr-1"></i>
              {doc.owner_name}
            </span>
          )}
        </div>
        <div class="flex items-center space-x-2">
          {doc.effective_date && (
            <span>
              <i class="fas fa-calendar text-gray-400 mr-1"></i>
              {new Date(doc.effective_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {doc.review_due && (
        <div class="mt-3 pt-3 border-t border-gray-200">
          <span class="text-xs text-gray-500">
            <i class="fas fa-clock text-gray-400 mr-1"></i>
            Review due: {new Date(doc.review_due).toLocaleDateString()}
          </span>
        </div>
      )}
    </a>
  )
}

export function DocumentList({ documents, emptyMessage }: { documents: any[], emptyMessage?: string }) {
  if (!documents || documents.length === 0) {
    return (
      <div class="text-center py-12">
        <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 text-lg">{emptyMessage || 'No documents found'}</p>
      </div>
    )
  }

  return (
    <div class="space-y-4">
      {documents.map((doc: any) => (
        <DocumentCard doc={doc} />
      ))}
    </div>
  )
}
