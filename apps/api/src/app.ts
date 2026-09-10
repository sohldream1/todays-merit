import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { badgesRouter } from "./routes/badges.routes.js";
import { campaignsRouter } from "./routes/campaigns.routes.js";
import { integrationsRouter } from "./routes/integrations.routes.js";
import { meRouter } from "./routes/me.routes.js";
import { opportunitiesRouter } from "./routes/opportunities.routes.js";
import { organizationsRouter } from "./routes/organizations.routes.js";
import { platformAdminRouter } from "./routes/platformAdmin.routes.js";
import { swagRouter } from "./routes/swag.routes.js";
import { teamInvitesRouter } from "./routes/teamInvites.routes.js";
import { tiersRouter } from "./routes/tiers.routes.js";
import { volunteerHoursRouter } from "./routes/volunteerHours.routes.js";

export const app = express();

app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/volunteer-hours", volunteerHoursRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/swag", swagRouter);
app.use("/api/tiers", tiersRouter);
app.use("/api/platform-admin", platformAdminRouter);
app.use("/api/team-invites", teamInvitesRouter);
app.use("/api/me", meRouter);

app.use(errorHandler);
