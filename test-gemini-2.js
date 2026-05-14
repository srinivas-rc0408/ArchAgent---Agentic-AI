
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyBmOsLVGOnxvqR8GuyjJXF0sjpWh-lR1VI");
console.log("Type of genAI:", typeof genAI);
console.log("Methods on genAI:", Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));
if (typeof genAI.getGenerativeModel === 'function') {
  console.log("getGenerativeModel IS a function");
} else {
  console.log("getGenerativeModel IS NOT a function");
}
