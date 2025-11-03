import type { Document } from '../db/schema';

// Generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Ensure unique slug
export async function ensureUniqueSlug(db: D1Database, baseSlug: string, documentId?: number): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = documentId
      ? db.prepare('SELECT id FROM documents WHERE slug = ? AND id != ?').bind(slug, documentId)
      : db.prepare('SELECT id FROM documents WHERE slug = ?').bind(slug);

    const existing = await query.first();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Detect file type from MIME type
export function detectFileType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'docx';
  if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) return 'xlsx';
  if (mimeType.includes('csv')) return 'csv';
  if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) return 'pptx';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('markdown')) return 'markdown';
  if (mimeType.includes('image')) return 'image';
  return 'text';
}

// Auto-classify content type from title and content
export function autoClassifyContentType(title: string, content?: string): string {
  const titleLower = title.toLowerCase();
  const fullText = `${titleLower} ${content || ''}`.toLowerCase();

  if (titleLower.includes('policy') || fullText.includes('policy statement')) return 'policy';
  if (titleLower.includes('procedure') || titleLower.includes('sop')) return 'procedure';
  if (titleLower.includes('work instruction')) return 'work_instruction';
  if (titleLower.includes('form') || titleLower.includes('template')) return 'form';
  if (titleLower.includes('guideline') || titleLower.includes('guide')) return 'guideline';
  if (titleLower.includes('register') || titleLower.includes('log')) return 'register';
  if (titleLower.includes('checklist')) return 'checklist';
  if (titleLower.includes('faq')) return 'faq';

  return 'policy'; // Default
}

// Extract text for search from various formats
export async function extractSearchContent(file: File, fileType: string): Promise<string> {
  // For now, return empty string
  // In production, integrate with document parsing libraries or APIs
  // For text-based formats, read content directly
  if (fileType === 'text' || fileType === 'markdown' || fileType === 'html') {
    return await file.text();
  }

  return '';
}

// Calculate file checksum
export async function calculateChecksum(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Store file in R2
export async function storeFile(
  storage: R2Bucket,
  file: File,
  documentId: number,
  versionNumber: number
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const key = `documents/${documentId}/v${versionNumber}/${file.name}`;

  await storage.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type
    }
  });

  return key;
}

// Get file from R2
export async function getFile(storage: R2Bucket, fileKey: string): Promise<R2ObjectBody | null> {
  return await storage.get(fileKey);
}

// Delete file from R2
export async function deleteFile(storage: R2Bucket, fileKey: string): Promise<void> {
  await storage.delete(fileKey);
}

// Search documents
export interface SearchOptions {
  query?: string;
  contentType?: string;
  category?: number;
  businessUnit?: number;
  status?: string;
  owner?: number;
  tags?: number[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  includeArchived?: boolean;
}

export async function searchDocuments(db: D1Database, options: SearchOptions) {
  let query = `
    SELECT DISTINCT d.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as owner_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (options.query) {
    query += ` AND (
      d.title LIKE ? OR
      d.summary LIKE ? OR
      d.search_content LIKE ?
    )`;
    const searchPattern = `%${options.query}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (options.contentType) {
    query += ` AND d.content_type = ?`;
    params.push(options.contentType);
  }

  if (options.category) {
    query += ` AND d.category_id = ?`;
    params.push(options.category);
  }

  if (options.businessUnit) {
    query += ` AND d.business_unit_id = ?`;
    params.push(options.businessUnit);
  }

  if (options.status) {
    query += ` AND d.status = ?`;
    params.push(options.status);
  } else if (!options.includeArchived) {
    query += ` AND d.status != 'archived'`;
  }

  if (options.owner) {
    query += ` AND d.owner_id = ?`;
    params.push(options.owner);
  }

  if (options.fromDate) {
    query += ` AND d.effective_date >= ?`;
    params.push(options.fromDate);
  }

  if (options.toDate) {
    query += ` AND d.effective_date <= ?`;
    params.push(options.toDate);
  }

  if (options.tags && options.tags.length > 0) {
    query += ` AND d.id IN (
      SELECT document_id FROM document_tags WHERE tag_id IN (${options.tags.map(() => '?').join(',')})
    )`;
    params.push(...options.tags);
  }

  // Sorting
  if (options.sortBy === 'title') {
    query += ` ORDER BY d.title ASC`;
  } else if (options.sortBy === 'date') {
    query += ` ORDER BY d.effective_date DESC`;
  } else {
    // Relevance sorting (simple version)
    query += ` ORDER BY d.updated_at DESC`;
  }

  // Pagination
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all();

  return result.results;
}

// Get document by slug
export async function getDocumentBySlug(db: D1Database, slug: string) {
  const doc = await db.prepare(`
    SELECT d.*,
      c.name as category_name,
      c.slug as category_slug,
      sc.name as subcategory_name,
      bu.name as business_unit_name,
      o.name as owner_name,
      o.email as owner_email,
      r.name as reviewer_name,
      a.name as approver_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    LEFT JOIN categories sc ON d.subcategory_id = sc.id
    LEFT JOIN business_units bu ON d.business_unit_id = bu.id
    LEFT JOIN users o ON d.owner_id = o.id
    LEFT JOIN users r ON d.reviewer_id = r.id
    LEFT JOIN users a ON d.approver_id = a.id
    WHERE d.slug = ?
  `).bind(slug).first();

  if (!doc) return null;

  // Get tags
  const tags = await db.prepare(`
    SELECT t.* FROM tags t
    JOIN document_tags dt ON t.id = dt.tag_id
    WHERE dt.document_id = ?
  `).bind(doc.id).all();

  // Get current version
  const version = await db.prepare(`
    SELECT * FROM document_versions
    WHERE document_id = ? AND is_current = 1
  `).bind(doc.id).first();

  return {
    ...doc,
    tags: tags.results,
    currentVersion: version
  };
}

// Get related documents
export async function getRelatedDocuments(db: D1Database, documentId: number) {
  const related = await db.prepare(`
    SELECT d.id, d.title, d.slug, d.content_type, d.status, rd.relationship_type
    FROM documents d
    JOIN related_documents rd ON d.id = rd.related_document_id
    WHERE rd.document_id = ?
  `).bind(documentId).all();

  return related.results;
}

// Get document versions
export async function getDocumentVersions(db: D1Database, documentId: number) {
  const versions = await db.prepare(`
    SELECT dv.*,
      u.name as uploader_name
    FROM document_versions dv
    LEFT JOIN users u ON dv.uploader_id = u.id
    WHERE dv.document_id = ?
    ORDER BY dv.version_number DESC
  `).bind(documentId).all();

  return versions.results;
}

// Check if review is due soon
export function isReviewDueSoon(reviewDue: string): { isDue: boolean; daysUntil: number } {
  const dueDate = new Date(reviewDue);
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isDue: daysUntil <= 30,
    daysUntil
  };
}

// Get documents requiring review
export async function getDocumentsRequiringReview(db: D1Database, userId?: number) {
  let query = `
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.status = 'published'
    AND d.review_due <= date('now', '+30 days')
  `;

  if (userId) {
    query += ` AND (d.owner_id = ? OR d.reviewer_id = ?)`;
  }

  query += ` ORDER BY d.review_due ASC`;

  const stmt = db.prepare(query);
  if (userId) {
    return (await stmt.bind(userId, userId).all()).results;
  }
  return (await stmt.all()).results;
}
