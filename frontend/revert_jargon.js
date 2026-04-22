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
  
  // Re-introduce USDC and USYC gracefully
  content = content.replace(/automatic 5% interest/g, 'yield via USYC');
  content = content.replace(/Yield Balance/g, 'USYC');
  content = content.replace(/Deposit Funds/g, 'Deposit USDC');
  content = content.replace(/Withdraw All Funds/g, 'Withdraw to USDC');
  content = content.replace(/Funds available instantly/g, 'USYC → USDC instantly');
  
  // We can keep 'Live Network' or change it to 'Live on Arc'. Let's do 'Live on Arc' 
  // since the prompt says "Build the Agentic Economy on Arc"
  content = content.replace(/Live Network/g, 'Live on Arc');

  // Fix wallet explanations
  content = content.replace(/Deposit Funds — \$0\.01 stays available for instant reads\./g, 'Deposit USDC — $0.01 stays as float for reads.');
  content = content.replace(/Rest auto-stakes into USYC — earning yield while you browse\./g, 'Rest auto-stakes into USYC — earning 5% yield while you browse.');
  content = content.replace(/Each read redeems \$0\.001 USYC — settled securely and beautifully\./g, 'Each read redeems $0.001 USYC → USDC — settled atomically on Arc.');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Reverted jargon on ${fileRelPath}`);
});
