import { app } from "./app.js";
import { env } from "./lib/env.js";
import { ensurePlatformTiers } from "./lib/gamification.js";

ensurePlatformTiers()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`API listening on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to seed platform tiers:", err);
    process.exit(1);
  });
