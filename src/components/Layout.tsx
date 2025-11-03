import type { User } from '../db/schema'

interface LayoutProps {
  user: User | null;
  title?: string;
  children: any;
}

export function Layout({ user, title, children }: LayoutProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-3">
              <a href="/" class="flex items-center space-x-3">
                <i class="fas fa-book-medical text-3xl text-blue-600"></i>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Age With Care</h1>
                  <p class="text-sm text-gray-500">Policy & Procedure Wiki</p>
                </div>
              </a>
            </div>
            
            {/* Navigation */}
            <nav class="hidden md:flex items-center space-x-6">
              <a href="/categories/policies" class="text-gray-700 hover:text-blue-600">Policies</a>
              <a href="/categories/procedures" class="text-gray-700 hover:text-blue-600">Procedures</a>
              <a href="/categories/forms" class="text-gray-700 hover:text-blue-600">Forms</a>
              <a href="/categories/guidelines" class="text-gray-700 hover:text-blue-600">Guidelines</a>
              <a href="/search" class="text-gray-700 hover:text-blue-600">
                <i class="fas fa-search"></i> Search
              </a>
            </nav>

            <div class="flex items-center space-x-4">
              {user ? (
                <>
                  <span class="text-gray-700">Welcome, {user.name}</span>
                  {user && (
                    <a href="/admin" class="btn-primary text-sm">
                      <i class="fas fa-cog mr-1"></i> Admin
                    </a>
                  )}
                  <a href="/api/auth/logout" class="text-gray-600 hover:text-gray-900">
                    <i class="fas fa-sign-out-alt"></i> Logout
                  </a>
                </>
              ) : (
                <a href="/login" class="btn-primary text-sm">
                  <i class="fas fa-sign-in-alt mr-1"></i> Login
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      {title && (
        <div class="bg-gray-100 border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div class="breadcrumb">
              <a href="/">Home</a>
              <span class="breadcrumb-separator">/</span>
              <span class="text-gray-900 font-medium">{title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

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
    </div>
  )
}
