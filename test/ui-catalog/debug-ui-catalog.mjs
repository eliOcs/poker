#!/usr/bin/env node
/**
 * Debug script for UI catalog
 *
 * Usage: node test/ui-catalog/debug-ui-catalog.mjs [test-id]
 *
 * Examples:
 *   node test/ui-catalog/debug-ui-catalog.mjs landing-page
 *   node test/ui-catalog/debug-ui-catalog.mjs history-loading
 */

import { debugPage } from "../e2e/utils/page-debug.js";

const testId = process.argv[2] || "landing-page";
const url = `http://localhost:8445/?test=${testId}`;
const selector = testId.startsWith("history")
  ? "phg-history"
  : "phg-home, phg-game";

await debugPage(url, selector);
