const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/admin/dashboard.js',
  'src/pages/admin/sales.js',
  'src/pages/admin/employees.js',
  'src/pages/admin/spareparts.js',
  'src/pages/admin/setting.js',
  'src/pages/admin/reports.js',
  'src/pages/admin/finances.js',
  'src/pages/admin/categories&brands.js',
  'src/pages/admin/transactions.js',
  'src/pages/manager/dashboard.js',
  'src/pages/manager/customersInfo.js',
  'src/pages/manager/messages.js',
  'src/pages/manager/generateSales.js',
  'src/pages/manager/loans.js',
  'src/pages/manager/reports.js',
  'src/pages/manager/sales.js',
  'src/pages/manager/spareparts.js',
  'src/pages/manager/transactions.js',
  'src/login.js',
];

const importPages =
  "import { PageLoader, InlineLoader, OverlayLoader, ButtonLoader } from '../../components/LoadingSpinner';";
const importLogin =
  "import { ButtonLoader } from './components/LoadingSpinner';";

for (const rel of files) {
  const file = path.join(__dirname, '..', rel);
  if (!fs.existsSync(file)) {
    console.log('skip missing', rel);
    continue;
  }
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('LoadingSpinner')) {
    const importLine = rel.includes('login.js') ? importLogin : importPages;
    const lastImport = src.lastIndexOf('\nimport ');
    const lineEnd = src.indexOf('\n', lastImport + 1);
    src = `${src.slice(0, lineEnd + 1)}${importLine}\n${src.slice(lineEnd + 1)}`;
  }

  src = src.replace(
    /if \(loading\) \{\s*return \(\s*<div[\s\S]*?minHeight: '100vh'[\s\S]*?<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  src = src.replace(
    /if \(loading\) \{\s*return \(\s*<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' \}\}>\s*\{t\.loading\}\s*<\/div>\s*\);\s*\}/g,
    'if (loading) {\n    return <PageLoader message={t.loading} />;\n  }'
  );

  src = src.replace(
    /if \(loading\) \{\s*return \(\s*<div className="dashboard-container">[\s\S]*?<p>\{t\.loading \|\| 'Loading'\}\.\.\.<\/p>[\s\S]*?<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  src = src.replace(
    /if \(loadingOrNoUser\) \{\s*return \(\s*<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa' \}\}>\s*Loading\.\.\.\s*<\/div>\s*\);\s*\}/g,
    "if (loadingOrNoUser) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  src = src.replace(
    /<td colSpan="(\d+)" className="no-data loading-cell">\s*\{([^}]+)\}\s*<\/td>/g,
    '<td colSpan="$1" className="no-data loading-cell"><InlineLoader message={$2} size="md" /></td>'
  );

  src = src.replace(
    /<div className="manager-reports-loading">\s*\{([^}]+)\}\s*<\/div>/g,
    '<div className="manager-reports-loading"><InlineLoader message={$1} size="md" showDots /></div>'
  );

  src = src.replace(
    /\{loadingData \? 'Loading\.\.\.' : 'Generate Sales'\}/g,
    "{loadingData ? <ButtonLoader message='Loading...' size='sm' /> : 'Generate Sales'}"
  );

  src = src.replace(
    /\{loading \? 'Logging in\.\.\.' : 'Login'\}/g,
    "{loading ? <ButtonLoader message='Logging in...' size='sm' /> : 'Login'}"
  );

  if (rel.includes('manager/spareparts.js')) {
    src = src.replace(
      /if \(loading && spareParts\.length === 0\) \{\s*return \(\s*<div[\s\S]*?minHeight: '100vh'[\s\S]*?<\/div>\s*\);\s*\}/g,
      "if (loading && spareParts.length === 0) {\n    return <PageLoader message={t.loadingSpareParts || t.loading} />;\n  }"
    );
  }

  fs.writeFileSync(file, src);
  console.log('updated', rel);
}
