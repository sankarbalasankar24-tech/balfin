// Fetch latest GitHub Actions run/job logs and grep for errors.
import { execSync } from "child_process";
import { writeFileSync } from "fs";

function ghToken() {
  const out = execSync(
    `printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill`,
    { shell: "bash", encoding: "utf8" }
  );
  const line = out.split("\n").find((l) => l.startsWith("password="));
  return line ? line.slice(9).trim() : "";
}

const token = ghToken();
if (!token) {
  console.log("NO_TOKEN");
  process.exit(0);
}
const repo = "sankarbalasankar24-tech/balfin";
const h = { Authorization: `token ${token}` };

const runsRes = await fetch(
  `https://api.github.com/repos/${repo}/actions/runs?per_page=1`,
  { headers: h }
);
const runs = await runsRes.json();
const run = runs.workflow_runs?.[0];
if (!run) {
  console.log("NO_RUNS");
  process.exit(0);
}
console.log(`run: ${run.id} status=${run.status} conclusion=${run.conclusion}`);

const jobsRes = await fetch(
  `https://api.github.com/repos/${repo}/actions/runs/${run.id}/jobs`,
  { headers: h }
);
const jobs = await jobsRes.json();
const job = jobs.jobs?.[0];
if (!job) {
  console.log("NO_JOB");
  process.exit(0);
}
console.log(`job: ${job.id} conclusion=${job.conclusion}`);

const logRes = await fetch(
  `https://api.github.com/repos/${repo}/actions/jobs/${job.id}/logs`,
  { headers: h, redirect: "follow" }
);
const log = await logRes.text();

// print failing step and surrounding lines
const lines = log.split("\n");
let firstError = lines.findIndex((l) =>
  /##\[error\]|\bERROR\b|FAILURE:|What went wrong|exit code 1/i.test(l)
);
if (firstError === -1) firstError = Math.max(0, lines.length - 40);
console.log("---- log around first error ----");
console.log(lines.slice(Math.max(0, firstError - 8), firstError + 25).join("\n"));
writeFileSync(new URL("./gh-job.log", import.meta.url), log);
