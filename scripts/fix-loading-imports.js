const fs = require('fs');
const path = require('path');

const map = {
  'src/pages/admin/dashboard.js': ['PageLoader'],
  'src/pages/admin/sales.js': ['PageLoader', 'ButtonLoader'],
  'src/pages/admin/employees.js': ['PageLoader'],
  'src/pages/admin/spareparts.js': ['PageLoader'],
  'src/pages/admin/setting.js': ['PageLoader'],
  'src/pages/admin/reports.js': ['PageLoader'],
  'src/pages/admin/finances.js': ['PageLoader'],
  'src/pages/admin/categories&brands.js': ['PageLoader'],
  'src/pages/admin/transactions.js': ['PageLoader'],
  'src/pages/manager/dashboard.js': ['PageLoader'],
  'src/pages/manager/customersInfo.js': ['PageLoader'],
  'src/pages/manager/messages.js': ['PageLoader'],
  'src/pages/manager/generateSales.js': ['PageLoader', 'InlineLoader'],
  'src/pages/manager/loans.js': ['PageLoader'],
  'src/pages/manager/reports.js': ['PageLoader', 'InlineLoader'],
  'src/pages/manager/sales.js': ['PageLoader', 'InlineLoader'],
  'src/pages/manager/spareparts.js': ['PageLoader', 'InlineLoader'],
  'src/pages/manager/transactions.js': ['PageLoader'],
  'src/login.js': ['ButtonLoader'],
};

for (const [rel, names] of Object.entries(map)) {
  const file = path.join(__dirname, '..', rel);
  let src = fs.readFileSync(file, 'utf8');
  const importPath = rel.includes('login.js')
    ? './components/LoadingSpinner'
    : '../../components/LoadingSpinner';
  const importLine = `import { ${names.join(', ')} } from '${importPath}';`;
  src = src.replace(
    /import \{ [^}]+\ } from '\.\.?\/\.?\.?\/components\/LoadingSpinner';/,
    importLine
  );
  fs.writeFileSync(file, src);
  console.log('fixed', rel);
}
