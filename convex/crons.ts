import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Runs every evening at 22:00 IST (16:30 UTC). scheduledSync checks the
// user's backup cadence (daily / weekly / monthly) and only pushes when the
// current IST day matches — Sunday for weekly, the 1st for monthly.
crons.daily(
  "balfin-sheet-backup",
  { hourUTC: 16, minuteUTC: 30 },
  api.sheets.scheduledSync,
  {}
);

export default crons;
