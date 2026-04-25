import hre from "hardhat";

async function main() {
  const mockTellerAddress = "0xbeF227aa509d925C255cE91345D0fcbc533a1048";
  const mockTeller = await hre.viem.getContractAt("MockTeller", mockTellerAddress as `0x${string}`);
  const usycTokenAddress = await mockTeller.read.usycToken();
  console.log("USYC Token Address:", usycTokenAddress);
}

main().catch(console.error);
