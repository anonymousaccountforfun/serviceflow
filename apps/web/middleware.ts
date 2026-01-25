import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Define public routes that don't require authentication
  publicRoutes: [
    '/',                          // Landing page
    '/sign-in(.*)',               // Sign in pages
    '/sign-up(.*)',               // Sign up pages
    '/api/webhooks(.*)',          // Webhook endpoints
    '/estimate/(.*)',             // Public estimate viewing
    '/invoice/(.*)',              // Public invoice viewing
    '/pay/(.*)',                  // Payment pages
    '/r/(.*)',                    // Review short links
    '/api/health',                // Health check
  ],
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
