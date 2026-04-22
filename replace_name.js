const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  'SUBMISSION.md',
  'contracts',
  'content',
  'frontend/src',
  'frontend/scripts',
  'frontend/prisma'
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content
    .replace(/ReadFlow/g, 'HumbleHumansHub')
    .replace(/readflow/g, 'humblehumanshub');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (dir.endsWith('.ts') || dir.endsWith('.tsx') || dir.endsWith('.md') || dir.endsWith('.mdx') || dir.endsWith('.sol') || dir.endsWith('.prisma')) {
      replaceInFile(dir);
    }
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file !== 'node_modules' && file !== '.next') {
        walkDir(path.join(dir, file));
      }
    }
  }
}

for (const dir of DIRECTORIES) {
  walkDir(path.join(__dirname, dir));
}

console.log("Done replacing.");
