#!/usr/bin/env node

/**
 * Khybersoft Deployment Script
 * Extracts PHP code from documentation data files and creates actual file structure
 * 
 * Usage: node deploy.js
 */

const fs = require('fs');
const path = require('path');

// Import all data files
const dataFiles = [
  './src/data/phpFiles.ts',
  './src/data/adminFiles.ts',
  './src/data/crudBase.ts',
  './src/data/crudContent.ts',
  './src/data/crudProducts.ts',
  './src/data/crudBusiness.ts',
  './src/data/crudSystem.ts',
  './src/data/frontLayout.ts',
  './src/data/frontViews.ts',
  './src/data/frontProductViews.ts',
  './src/data/frontBlogViews.ts',
  './src/data/frontAdditionalViews.ts',
  './src/data/advancedSearch.ts',
  './src/data/advancedEmail.ts',
  './src/data/advancedSystem.ts',
  './src/data/uiComponents.ts',
  './src/data/uiPolish.ts',
  './src/data/spamProtection.ts',
];

console.log('🚀 Khybersoft Deployment Script\n');
console.log('Extracting PHP files from documentation data...\n');

let totalFiles = 0;
let totalDirs = new Set();

// Process each data file
dataFiles.forEach(dataFilePath => {
  if (!fs.existsSync(dataFilePath)) {
    console.log(`⚠️  Skipping ${dataFilePath} (not found)`);
    return;
  }

  const content = fs.readFileSync(dataFilePath, 'utf8');
  
  // Extract file objects using regex
  const fileRegex = /{\s*path:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*language:\s*['"]([^'"]+)['"],\s*(?:[^}]*?,\s*)?content:\s*`([\s\S]*?)`/g;
  
  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const [, filePath, fileName, language, fileContent] = match;
    
    // Skip non-PHP/SQL/JS files
    if (!['php', 'sql', 'js', 'apache', 'ini'].includes(language)) {
      continue;
    }
    
    // Create directory if needed
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      totalDirs.add(dir);
    }
    
    // Write file
    fs.writeFileSync(filePath, fileContent);
    totalFiles++;
    
    console.log(`✅ Created: ${filePath}`);
  }
});

console.log(`\n✨ Deployment complete!`);
console.log(`📁 Created ${totalDirs.size} directories`);
console.log(`📄 Created ${totalFiles} files`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Copy files to your cPanel hosting`);
console.log(`   2. Create MySQL database`);
console.log(`   3. Visit https://yourdomain.com/install/`);
console.log(`   4. Follow the installation wizard`);
console.log(`\n🎉 Ready to deploy!`);
