#!/usr/bin/env tsx
/**
 * Initialize Agent Profiles
 * 
 * This script computes agent profiles for the first time or refreshes them.
 * Run this after setting up the system or when agent performance data changes.
 * 
 * Usage:
 *   npx tsx scripts/init-agent-profiles.ts
 */

import { PrismaAgentProfileRepo } from "../apps/api/src/infrastructure/agentProfile.repo";
import { calculateAllAgentProfiles } from "../packages/modules/agent-profiling/src/application/agentProfiler";

const ORG_ID = "org_1"; // TODO: Make this configurable

async function main() {
  console.log("🚀 Starting agent profile initialization...\n");
  
  const profileRepo = new PrismaAgentProfileRepo();
  
  try {
    // Check existing profiles
    const existing = await profileRepo.listByOrg(ORG_ID);
    console.log(`📊 Found ${existing.length} existing profiles`);
    
    if (existing.length > 0) {
      console.log("\n⚠️  Profiles already exist. This will refresh them.");
      console.log("   Existing profiles:");
      existing.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.agentName || p.agentUserId} - Conversion: ${(p.conversionRate || 0) * 100}%, Availability: ${p.availability}`);
      });
    }
    
    console.log("\n🔄 Computing agent profiles from historical data...");
    
    // Calculate all profiles
    const profiles = await calculateAllAgentProfiles(ORG_ID);
    
    if (profiles.length === 0) {
      console.log("\n⚠️  No agents found or no historical data available.");
      console.log("   Make sure you have:");
      console.log("   1. LeadFact records in the database");
      console.log("   2. Assigned agents in those records");
      console.log("   3. Monday.com users cached (run Monday connect in Admin)");
      process.exit(0);
    }
    
    console.log(`\n✅ Computed ${profiles.length} agent profiles`);
    
    // Save to database
    console.log("\n💾 Saving profiles to database...");
    await Promise.all(
      profiles.map(profile => profileRepo.upsert(profile))
    );
    
    console.log("\n✅ Successfully saved all profiles!\n");
    
    // Display summary
    console.log("📊 Agent Profile Summary:");
    console.log("─".repeat(80));
    profiles.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.agentName || p.agentUserId}`);
      console.log(`   Conversion Rate: ${((p.conversionRate || 0) * 100).toFixed(1)}%`);
      console.log(`   Leads Handled: ${p.totalLeadsHandled} (${p.totalLeadsConverted} converted)`);
      console.log(`   Availability: ${(p.availability * 100).toFixed(0)}% (${p.currentActiveLeads} active)`);
      console.log(`   Hot Streak: ${p.hotStreakActive ? `YES (${p.hotStreakCount} wins)` : "No"}`);
      console.log(`   Industry Scores: ${Object.keys(p.industryScores).length} industries tracked`);
      if (Object.keys(p.industryScores).length > 0) {
        const topIndustries = Object.entries(p.industryScores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);
        topIndustries.forEach(([industry, score]) => {
          console.log(`      - ${industry}: ${score}/100`);
        });
      }
    });
    
    console.log("\n" + "─".repeat(80));
    console.log("\n🎉 Agent profiles are ready!");
    console.log("\n💡 Next steps:");
    console.log("   1. Configure KPI weights in Admin Screen");
    console.log("   2. Test routing with POST /routing/execute");
    console.log("   3. Review routing explanations in Manager Screen\n");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
}

main();

