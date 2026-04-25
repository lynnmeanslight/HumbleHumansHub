const { GoogleGenAI } = require("@google/genai");
try {
  new GoogleGenAI({ apiKey: "" });
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message);
}
