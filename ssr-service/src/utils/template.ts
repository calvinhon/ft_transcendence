// ssr-service/src/utils/template.ts
import { generateMetaHTML, getMetaTags } from './metaTags.js';

export function generateHTML(route: string, content: string, data?: any): string {
  const meta = getMetaTags(route);
  const metaHTML = generateMetaHTML(meta);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FT Transcendence - Modern Pong with tournaments, blockchain leaderboards, and real-time multiplayer">
  <meta name="keywords" content="pong, game, multiplayer, tournament, blockchain, real-time">
  ${metaHTML}
  
  <!-- Preload critical resources -->
  <link rel="preconnect" href="http://localhost:3001">
  <link rel="preconnect" href="http://localhost:3002">
  
  <!-- Accessibility: Skip to main content -->
  <style>
    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: #667eea;
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
    }
    .skip-link:focus {
      top: 6px;
    }
  </style>
  
  <!-- Styles -->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      line-height: 1.6;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .ssr-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .ssr-header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
    }
    .ssr-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .ssr-content {
      background: #1a1a1a;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .ssr-badge {
      display: inline-block;
      background: #4CAF50;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .ssr-loading {
      text-align: center;
      padding: 2rem;
      color: #888;
      role: "status";
      aria-live: "polite";
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .stat-card {
      background: #2a2a2a;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      color: #ccc;
      margin-top: 0.5rem;
    }
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .stat-card {
        border: 2px solid #667eea;
      }
      .stat-value {
        color: #ffffff;
      }
    }
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <!-- Skip to main content link for accessibility -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <div class="ssr-container">
    <header class="ssr-header" role="banner">
      <h1>🏓 FT Transcendence</h1>
      <p>Server-Side Rendered Content</p>
    </header>
    
    <span class="ssr-badge" aria-label="Server-side rendering is enabled">✓ SSR Enabled</span>
    
    <main id="main-content" class="ssr-content" role="main">
      ${content}
    </main>
    
    <div class="ssr-loading" aria-live="polite" role="status">
      <p>🔄 Hydrating client-side application...</p>
    </div>
  </div>

  <!-- Hydration Data -->
  <script id="ssr-data" type="application/json">
    ${JSON.stringify(data || {})}
  </script>

  <!-- Hydration Script -->
  <script>
    // Client-side hydration
    window.addEventListener('DOMContentLoaded', () => {
      console.log('SSR: Client-side hydration started');
      
      // Parse SSR data
      const ssrDataEl = document.getElementById('ssr-data');
      if (ssrDataEl) {
        window.__SSR_DATA__ = JSON.parse(ssrDataEl.textContent || '{}');
        console.log('SSR: Data hydrated', window.__SSR_DATA__);
      }
      
      // Remove loading indicator
      const loadingEl = document.querySelector('.ssr-loading');
      if (loadingEl) {
        // Respect user's motion preferences
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delay = prefersReducedMotion ? 0 : 1000;
        
        setTimeout(() => {
          if (!prefersReducedMotion) {
            loadingEl.style.opacity = '0';
            loadingEl.style.transition = 'opacity 0.3s';
          }
          setTimeout(() => loadingEl.remove(), prefersReducedMotion ? 0 : 300);
        }, delay);
      }
      
      console.log('SSR: Hydration complete');
    });
  </script>
</body>
</html>`;
}
