import { loadInitial500Leads } from "../apps/api/src/services/initialDataLoader";

const orgId = "cmjt563ps000037hg6i4dvl7m";

console.log(`Loading initial 500 leads for org ${orgId}...`);

loadInitial500Leads(orgId)
  .then(result => {
    console.log("\n✅ Initial data load completed!");
    console.log(`  Loaded: ${result.loaded}`);
    console.log(`  Errors: ${result.errors}`);
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
