#!/usr/bin/env node
import { Command } from "commander";
import { SiegeRunner } from "./runner.js";
import { generateScorecardHtml, generateScorecardJson, generateScorecardBadgeSvg } from "./reporter.js";
import * as path from "node:path";
import * as http from "node:http";

const program = new Command();

program
  .name("warrant-siege")
  .description("Adversarial safety test harness and automated scorecard generator for voice agent gateways")
  .version("1.0.0")
  .option("-t, --target <url>", "Target Warrant Gateway MCP URL", "http://localhost:8000/mcp")
  .option("-a, --admin <url>", "Target Warrant Gateway Admin API URL", "http://localhost:8000/admin")
  .option("-o, --out <path>", "Path to write HTML scorecard", "./scorecard.html")
  .option("-j, --json <path>", "Path to write JSON scorecard", "./scorecard.json")
  .option("-b, --badge <path>", "Path to write SVG scorecard badge", "./scorecard-badge.svg")
  .action(async (options) => {
    console.log("\n========================================================");
    console.log("🛡️  WARRANT SIEGE: Adversarial Voice Gateway Harness");
    console.log("========================================================");
    console.log(`Target MCP:  ${options.target}`);
    console.log(`Admin API:   ${options.admin}`);
    console.log(`HTML Report: ${options.out}`);
    console.log(`JSON Report: ${options.json}`);
    console.log("--------------------------------------------------------\n");

    let serverToClose: http.Server | null = null;
    let repoToClose: any = null;
    let targetMcp = options.target;
    let targetAdmin = options.admin;

    try {
      // Check if target gateway is responding
      let isLive = false;
      try {
        const res = await fetch(options.target, { method: "GET", signal: AbortSignal.timeout(1200) });
        isLive = res.status < 500;
      } catch {
        isLive = false;
      }

      if (!isLive) {
        // Attempt dynamic load of @warrant/gateway if present in monorepo
        let gatewayModule: any = null;
        try {
          // Dynamic import allows standalone siege execution without packaging gateway source
          // @ts-ignore
          gatewayModule = await import("@warrant/gateway");
        } catch {
          gatewayModule = null;
        }

        if (gatewayModule && typeof gatewayModule.createGatewayApp === "function") {
          console.log("ℹ️  No external gateway running at target. Starting ephemeral in-memory gateway instance on port 8199...");
          const PORT = 8199;
          repoToClose = new gatewayModule.WarrantRepository(":memory:");
          const { app } = gatewayModule.createGatewayApp({ repo: repoToClose, port: PORT });
          await new Promise<void>((resolve) => {
            serverToClose = app.listen(PORT, () => resolve());
          });
          targetMcp = `http://127.0.0.1:${PORT}/mcp`;
          targetAdmin = `http://127.0.0.1:${PORT}/admin`;
          console.log(`   Connected to ephemeral gateway at ${targetMcp}\n`);
        } else {
          console.error(`❌ Target gateway not reachable at ${options.target}.`);
          console.error("   When running warrant-siege standalone against a remote or local gateway,");
          console.error("   ensure the gateway is running and specify target endpoints:");
          console.error("   warrant-siege --target <mcp-url> --admin <admin-url>\n");
          process.exit(1);
        }
      }

      const runner = new SiegeRunner(targetMcp, targetAdmin);
      console.log("Executing 11 Core Adversarial Scenarios (S1 – S11)...\n");
      const scorecard = await runner.runAll();

      for (const res of scorecard.results) {
        const mark = res.passed ? "✅ [PASS]" : "❌ [FAIL]";
        console.log(`${mark} ${res.scenarioId}: ${res.name} (${res.durationMs}ms)`);
        console.log(`      ↳ Invariant: ${res.targetInvariant} | ${res.assertion}`);
      }

      console.log("\n--------------------------------------------------------");
      console.log("Architectural Invariants Verification:");
      for (const [id, inv] of Object.entries(scorecard.invariants)) {
        const mark = inv.satisfied ? "✅ SATISFIED" : "❌ BREACHED";
        console.log(`  ${id} [${mark}]: ${inv.name}`);
      }

      console.log("\nCryptographic Audit Trail:");
      console.log(`  Tip Hash: ${scorecard.auditProofHash}`);

      const htmlPath = path.resolve(process.cwd(), options.out);
      const jsonPath = path.resolve(process.cwd(), options.json);
      const badgePath = path.resolve(process.cwd(), options.badge);

      await generateScorecardHtml(scorecard, htmlPath);
      await generateScorecardJson(scorecard, jsonPath);
      await generateScorecardBadgeSvg(scorecard, badgePath);

      console.log("\n========================================================");
      console.log(`Scorecard: ${scorecard.passedScenarios}/${scorecard.totalScenarios} Scenarios Passed`);
      console.log(`HTML Scorecard saved to:  ${htmlPath}`);
      console.log(`JSON Scorecard saved to:  ${jsonPath}`);
      console.log(`SVG Badge saved to:       ${badgePath}`);
      console.log("========================================================\n");

      if (serverToClose) {
        await new Promise<void>((resolve) => (serverToClose as http.Server).close(() => resolve()));
      }
      if (repoToClose) {
        repoToClose.close();
      }

      if (scorecard.allInvariantsSatisfied) {
        console.log("🎉 ALL INVARIANTS SATISFIED. Gateway certified safe.\n");
        process.exit(0);
      } else {
        console.error("⚠️ SAFETY FAILURE: One or more invariants were breached.\n");
        process.exit(1);
      }
    } catch (err: any) {
      if (serverToClose) {
        await new Promise<void>((resolve) => (serverToClose as http.Server).close(() => resolve()));
      }
      if (repoToClose) {
        repoToClose.close();
      }
      console.error("\n❌ Siege Execution Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
