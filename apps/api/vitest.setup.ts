import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Runs before any test file is loaded, so this has to be the first thing to
// touch process.env — lib/env.ts reads required vars at import time, and
// anything importing it (directly or via app.js) needs the test database's
// connection string in place before that happens.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.test"), override: true });
