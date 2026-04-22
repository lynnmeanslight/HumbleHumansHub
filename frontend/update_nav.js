const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/app/page.tsx',
  'src/app/wallet/page.tsx',
  'src/app/writer/page.tsx',
  'src/app/writer/new/page.tsx',
  'src/app/read/page.tsx',
  'src/app/read/[slug]/page.tsx'
];

targetFiles.forEach(fileRelPath => {
  const filePath = path.join(__dirname, fileRelPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace Nav Bar links
  content = content.replace(/>Read<\/Link>/g, '>Articles</Link>');
  content = content.replace(/>Writer<\/Link>/g, '>Publish</Link>');
  content = content.replace(/>Wallet<\/Link>/g, '>Account</Link>');
  
  // Clean up back links
  content = content.replace(/‹ Dashboard<\/Link>/g, '‹ Dashboard</Link>'); // unchanged for now unless needs change
  
  // Replace CTA buttons in page.tsx if any
  content = content.replace(/>Start Reading<\/Link>/g, '>Explore Articles</Link>');
  content = content.replace(/>For Writers ›<\/Link>/g, '>For Creators ›</Link>');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${fileRelPath}`);
});
