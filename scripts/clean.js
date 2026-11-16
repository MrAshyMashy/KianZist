#!/usr/bin/env node
/**
 * KianZist — Cleanup Script
 * -------------------------
 * Removes build artifacts, caches, and temporary files that often
 * cause unexpected bugs or stale states in Next.js web projects.
 *
 * Usage: npm run clean
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Directories to remove completely
const DIRECTORIES = [
  ".next", // Next.js build output
  "out", // Next.js static export output (if any)
  "node_modules/.cache", // Webpack/Babel cache
  "node_modules/.vite", // Vite cache (just in case)
  ".turbo", // Turbopack cache
  "coverage", // Test coverage reports
];

// Individual files to remove
const FILES = [
  "tsconfig.tsbuildinfo", // TypeScript incremental build info
  ".eslintcache", // ESLint cache
  "npm-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "build-debug.log",
];

// Terminal color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const log = (msg, color = "reset") =>
  console.log(colors[color] + msg + colors.reset);

/**
 * Recursively deletes a directory if it exists.
 * @param {string} dirPath - Absolute path to the directory.
 * @returns {boolean} - True if deleted, false otherwise.
 */
const removeDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) return false;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  } catch (err) {
    log(
      `   ❌ Failed to remove dir: ${path.basename(dirPath)} (${err.message})`,
      "red",
    );
    return false;
  }
};

/**
 * Deletes a file if it exists.
 * @param {string} filePath - Absolute path to the file.
 * @returns {boolean} - True if deleted, false otherwise.
 */
const removeFile = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  try {
    fs.rmSync(filePath, { force: true });
    return true;
  } catch (err) {
    log(
      `   ❌ Failed to remove file: ${path.basename(filePath)} (${err.message})`,
      "red",
    );
    return false;
  }
};

// =========================================================
// MAIN EXECUTION
// =========================================================

console.log("");
log("╔══════════════════════════════════════════════════╗", "cyan");
log("║  🧹 KianZist — Workspace Cleanup                 ║", "cyan");
log("╚══════════════════════════════════════════════════╝", "cyan");
console.log("");

let removedCount = 0;

// 1. Clean Directories
log("📁 Scanning for directories...", "gray");
for (const dir of DIRECTORIES) {
  const fullPath = path.join(ROOT, dir);
  if (removeDir(fullPath)) {
    log(`   ✅ Removed: ${dir}`, "green");
    removedCount++;
  }
}

// 2. Clean Specific Files
log("\n📄 Scanning for temporary files...", "gray");
for (const file of FILES) {
  const fullPath = path.join(ROOT, file);
  if (removeFile(fullPath)) {
    log(`   ✅ Removed: ${file}`, "green");
    removedCount++;
  }
}

// 3. Clean any loose *.log files in the root directory (depth = 1)
log("\n📝 Scanning for loose .log files...", "gray");
try {
  const rootFiles = fs.readdirSync(ROOT);
  for (const entry of rootFiles) {
    const fullPath = path.join(ROOT, entry);
    if (fs.statSync(fullPath).isFile() && entry.endsWith(".log")) {
      if (removeFile(fullPath)) {
        log(`   ✅ Removed: ${entry}`, "green");
        removedCount++;
      }
    }
  }
} catch (err) {
  // Ignore errors when reading root directory
}

// =========================================================
// SUMMARY
// =========================================================

console.log("");
if (removedCount === 0) {
  log("✨ Workspace is already perfectly clean!", "yellow");
} else {
  log(
    `🎉 Cleanup complete. ${removedCount} item(s) successfully removed.`,
    "green",
  );
}
console.log("");
