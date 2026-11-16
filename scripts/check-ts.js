#!/usr/bin/env node
/**
 * KianZist — TypeScript Checker
 * -----------------------------
 * Runs `tsc --noEmit` to check for any TypeScript errors across the project.
 * If errors are found, they are parsed and displayed in a clean, readable format.
 * 
 * Usage: npm run check-ts
 */

const { execSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Terminal color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};

const log = (msg, color = "reset") => console.log(colors[color] + msg + colors.reset);

console.log("");
log("╔══════════════════════════════════════════════════╗", "cyan");
log("║  🔍 KianZist — TypeScript Type Checker           ║", "cyan");
log("╚══════════════════════════════════════════════════╝", "cyan");
console.log("");

log("⏳ Analyzing project for TypeScript errors...\n", "yellow");

const startTime = Date.now();

try {
  // Run tsc --noEmit and capture output
  execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" });
  
  // If it reaches here, there were no errors
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  log("🎉 Awesome! Project is completely error-free!", "green");
  log(`⏱  Finished in ${duration}s`, "gray");
  log("🚀 You are ready to build.\n", "cyan");
  process.exit(0);
} catch (error) {
  // tsc exited with an error
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const output = error.stdout?.toString() || error.message;
  
  // Count the number of error lines
  const errorLines = output.split("\n").filter(line => line.includes("error TS"));
  const errorCount = errorLines.length;

  log(`❌ Found ${errorCount} TypeScript Error(s):\n`, "red");
  
  // Parse and print errors in a cleaner way
  errorLines.forEach((line) => {
    // Extract file path, line, and error message
    // Example: src/components/home/Hero.tsx(12,5): error TS2322: Type 'x' is not assignable to type 'y'.
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s(error TS\d+:\s.+)$/);
    
    if (match) {
      const [, file, lineNum, colNum, msg] = match;
      log(`  📄 ${colors.cyan}${file}${colors.reset}:${colors.yellow}${lineNum}${colors.reset}:${colors.yellow}${colNum}${colors.reset}`, "reset");
      log(`     └─ ${colors.red}${msg}${colors.reset}\n`, "reset");
    } else {
      // Fallback for other formats
      log(`  ${colors.red}${line}${colors.reset}\n`);
    }
  });

  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "gray");
  log(`⏱  Finished in ${duration}s`, "gray");
  log("💡 Tip: Fix the errors above and run 'npm run check-ts' again.\n", "cyan");
  
  process.exit(1);
}