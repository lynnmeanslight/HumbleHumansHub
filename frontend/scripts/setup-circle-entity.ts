import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;

  if (!apiKey) {
    console.error("❌ CIRCLE_API_KEY is not set in .env.local");
    console.error("Please add it before running this script.");
    process.exit(1);
  }

  console.log("Generating new Entity Secret...");
  // generateEntitySecret() from the SDK only prints to console, so we use Node's crypto to capture it
  const secret = crypto.randomBytes(32).toString("hex");
  console.log("\n✅ Entity Secret generated!");
  console.log("===============================================================");
  console.log(secret);
  console.log("===============================================================");
  console.log("⚠️  SAVE THIS SECRET IN A PASSWORD MANAGER. Circle does not store it.\n");

  console.log("Registering Entity Secret Ciphertext with Circle...");
  try {
    const response = await registerEntitySecretCiphertext({
      apiKey,
      entitySecret: secret,
      recoveryFileDownloadPath: process.cwd(),
    });
    
    console.log("\n✅ Successfully registered Entity Secret Ciphertext!");
    console.log("Recovery file downloaded to: ./circle-recovery-file.dat (Keep this safe!)");
    console.log("\n👉 Next Steps:");
    console.log("1. Add the Entity Secret generated above to your frontend/.env.local:");
    console.log(`   CIRCLE_ENTITY_SECRET=${secret}`);
  } catch (error) {
    console.error("\n❌ Failed to register entity secret:");
    console.error(error);
  }
}

main();
