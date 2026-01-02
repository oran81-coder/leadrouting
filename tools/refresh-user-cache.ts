async function main() {
  const apiUrl = "http://localhost:3000/admin/monday/users/refresh";
  const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWp0NTYzenAwMDA0MzdoZzZ3N2lmcnU1IiwiZW1haWwiOiJvcmFuODFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwib3JnSWQiOiJjbWp0NTYzcHMwMDAwMzdoZzZpNGR2bDdtIiwidXNlcm5hbWUiOiJvcmFuODEiLCJzZXNzaW9uSWQiOiJjbWp0bnFjcGwwMDdsMTM5YWl5OHZsM2E3IiwiaWF0IjoxNzY3MTYzODU0LCJleHAiOjE3NjcxNjc0NTQsImF1ZCI6ImxlYWQtcm91dGluZy1hcHAiLCJpc3MiOiJsZWFkLXJvdXRpbmctYXBpIn0.A8yz_D4mKtz6wU3cI3I2RJgzhSXAtNCP2SHmLbX7Hmc";

  console.log("\n🔄 Refreshing Monday.com user cache...\n");

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    console.log("✅ Success:", result);
    console.log(`\n📊 Cached ${result.count || 0} users\n`);
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
