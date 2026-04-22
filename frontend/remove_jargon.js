const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/app/page.tsx',
  'src/app/wallet/page.tsx',
  'src/app/writer/page.tsx',
  'src/app/writer/new/page.tsx',
  'src/app/read/page.tsx',
  'src/app/read/[slug]/page.tsx',
  'src/components/ConnectWallet.tsx',
  'src/components/PaymentGate.tsx',
  'src/components/LiveFeedTicker.tsx'
];

targetFiles.forEach(fileRelPath => {
  const filePath = path.join(__dirname, fileRelPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // page.tsx
  content = content.replace(/Live on Arc Testnet/g, 'Live Network');
  content = content.replace(/yield via USYC/g, 'automatic 5% interest');
  content = content.replace(/USYC/g, 'Yield Balance'); // Be careful, but most places it says "USYC"
  content = content.replace(/0.001 USDC/g, '$0.001');
  content = content.replace(/Why Arc\./g, 'Why it works.');
  content = content.replace(/Arc/g, 'Our Infrastructure'); // Replaces Arc table header
  content = content.replace(/withdraw to USDC/gi, 'Withdraw Funds');
  content = content.replace(/USYC → USDC via Teller/gi, 'Funds available instantly');
  
  // Wallet connect texts
  content = content.replace(/Connect Wallet/g, 'Connect');
  content = content.replace(/Wallet Balance/g, 'Account Balance');
  
  // Payment gates
  content = content.replace(/USDC → /g, '');
  content = content.replace(/Live on Our Infrastructure/g, 'Live Network');
  content = content.replace(/Our Infrastructure Block Explorer/g, 'Network Explorer');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${fileRelPath}`);
});
