import { createServer } from "./server";
import { startLeadIntakePoller } from "./services/leadIntakePoller";
import { startIndustryPoller } from "./services/industryPoller";
import { startMetricsJob } from "./services/metricsJob";

const port = process.env.PORT
  ? Number(process.env.PORT)
  : process.env.API_PORT
    ? Number(process.env.API_PORT)
    : 3000;

createServer().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
  startIndustryPoller();
  startLeadIntakePoller();
  startMetricsJob();
});