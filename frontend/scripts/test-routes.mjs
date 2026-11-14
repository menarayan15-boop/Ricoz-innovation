const routes = [
  '/',
  '/landing',
  '/dashboard-preview',
  '/dashboard',
  '/dashboard/applications',
  '/dashboard/applications/create',
  '/applications/new',
  '/dashboard/attorney',
  '/dashboard/documents',
  '/dashboard/assistant',
  '/dashboard/dossier',
  '/dashboard/notifications',
  '/dashboard/settings',
  '/login',
  '/register',
];

async function checkRoutes() {
  console.log('Testing Next.js routes on http://localhost:3001...\n');
  let failures = 0;

  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3001${route}`, {
        redirect: 'manual',
      });
      console.log(`[HTTP ${res.status}] ${route}`);
      if (res.status === 404 || res.status >= 500) {
        failures++;
      }
    } catch (err) {
      console.error(`[ERROR] ${route} -> ${err.message}`);
      failures++;
    }
  }

  console.log(`\nCompleted route check. Failures: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

checkRoutes();

