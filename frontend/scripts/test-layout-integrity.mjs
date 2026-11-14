const routes = [
  '/dashboard',
  '/dashboard/applications',
  '/dashboard/applications/create',
  '/dashboard/attorney',
  '/dashboard/documents',
  '/dashboard/assistant',
  '/dashboard/dossier',
  '/dashboard/notifications',
  '/dashboard/settings',
];

async function verifyLayoutIntegrity() {
  console.log('Testing Dashboard Layout Hierarchy (Strict Single Shell Check)...\n');
  let issues = 0;

  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3001${route}`);
      if (res.status !== 200) {
        console.error(`[FAIL] ${route} returned HTTP ${res.status}`);
        issues++;
        continue;
      }

      const html = await res.text();

      // Count occurrences of sidebar <aside elements
      const asideCount = (html.match(/<aside/g) || []).length;

      // Count occurrences of top header <header elements
      const headerCount = (html.match(/<header/g) || []).length;

      // Count occurrences of brand logo text inside sidebars
      const brandLogoCount = (html.match(/Immigration Dossier/g) || []).length;

      console.log(`Route: ${route}`);
      console.log(`  - HTTP Status: ${res.status}`);
      console.log(`  - Aside/Sidebar elements: ${asideCount}`);
      console.log(`  - Header elements: ${headerCount}`);

      if (asideCount !== 1) {
        console.error(`  [FAIL] Expected exactly 1 sidebar (<aside>), found ${asideCount}!`);
        issues++;
      } else {
        console.log(`  [PASS] Exactly 1 sidebar found.`);
      }

      if (headerCount !== 1) {
        console.error(`  [FAIL] Expected exactly 1 workspace header (<header>), found ${headerCount}!`);
        issues++;
      } else {
        console.log(`  [PASS] Exactly 1 workspace header found.`);
      }

      console.log('');
    } catch (err) {
      console.error(`[ERROR] ${route}: ${err.message}`);
      issues++;
    }
  }

  // Specific check for /dashboard/dossier content requirements
  try {
    const res = await fetch('http://localhost:3001/dashboard/dossier');
    const html = await res.text();

    const hasHeading = html.includes('Automated Dossier Generator');
    const hasSection = html.includes('Dossier Packet Assembly');
    const hasButton = html.includes('Configure New Packet');
    const hasH1B = html.includes('H-1B Specialty Occupation');
    const hasO1 = html.includes('O-1 Extraordinary Ability');
    const hasNIW = html.includes('EB-2 NIW Petition');

    console.log('Verifying /dashboard/dossier content requirements:');
    console.log(`  - Heading 'Automated Dossier Generator': ${hasHeading ? 'PASS' : 'FAIL'}`);
    console.log(`  - Main Section 'Dossier Packet Assembly': ${hasSection ? 'PASS' : 'FAIL'}`);
    console.log(`  - Button 'Configure New Packet': ${hasButton ? 'PASS' : 'FAIL'}`);
    console.log(`  - Card 'H-1B Specialty Occupation': ${hasH1B ? 'PASS' : 'FAIL'}`);
    console.log(`  - Card 'O-1 Extraordinary Ability': ${hasO1 ? 'PASS' : 'FAIL'}`);
    console.log(`  - Card 'EB-2 NIW Petition': ${hasNIW ? 'PASS' : 'FAIL'}`);

    if (!hasHeading || !hasSection || !hasButton || !hasH1B || !hasO1 || !hasNIW) {
      issues++;
    }
  } catch (err) {
    console.error(`[ERROR] Dossier content check: ${err.message}`);
    issues++;
  }

  console.log(`\n==================================================`);
  console.log(`LAYOUT INTEGRITY RESULT: ${issues === 0 ? 'ALL CHECKS PASSED (0 Issues)' : `FAILED with ${issues} issues`}`);
  console.log(`==================================================`);
  process.exit(issues > 0 ? 1 : 0);
}

verifyLayoutIntegrity();

