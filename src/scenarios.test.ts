import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createGatewayApp } from "@warrant/gateway";
import { WarrantRepository } from "@warrant/gateway";
import { SiegeRunner } from "./runner.js";
import { generateScorecardHtml, generateScorecardJson } from "./reporter.js";
import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("Warrant Siege: 11 Core Adversarial Attack Scenarios", () => {
  let server: http.Server;
  let mcpUrl: string;
  let adminUrl: string;
  let repo: WarrantRepository;
  const PORT = 8199;

  beforeAll(async () => {
    // In-memory SQLite for ephemeral isolated test run
    repo = new WarrantRepository(":memory:");
    const { app } = createGatewayApp({ repo, port: PORT });

    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => resolve());
    });

    mcpUrl = `http://127.0.0.1:${PORT}/mcp`;
    adminUrl = `http://127.0.0.1:${PORT}/admin`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    repo.close();
  });

  it("executes all 11 adversarial scenarios and satisfies all invariants I1-I10", async () => {
    const runner = new SiegeRunner(mcpUrl, adminUrl);
    const scorecard = await runner.runAll();

    expect(scorecard.totalScenarios).toBe(11);
    expect(scorecard.passedScenarios).toBe(11);
    expect(scorecard.failedScenarios).toBe(0);
    expect(scorecard.allInvariantsSatisfied).toBe(true);

    // Verify all 10 invariants I1 through I10
    expect(scorecard.invariants.I1.satisfied).toBe(true);
    expect(scorecard.invariants.I2.satisfied).toBe(true);
    expect(scorecard.invariants.I3.satisfied).toBe(true);
    expect(scorecard.invariants.I4.satisfied).toBe(true);
    expect(scorecard.invariants.I5.satisfied).toBe(true);
    expect(scorecard.invariants.I6.satisfied).toBe(true);
    expect(scorecard.invariants.I7.satisfied).toBe(true);
    expect(scorecard.invariants.I8.satisfied).toBe(true);
    expect(scorecard.invariants.I9.satisfied).toBe(true);
    expect(scorecard.invariants.I10.satisfied).toBe(true);

    // Verify cryptographic audit proof
    expect(scorecard.auditProofHash).toBeDefined();
    expect(scorecard.auditProofHash).toHaveLength(64);

    // Test scorecard reporter generation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "warrant-siege-test-"));
    const htmlPath = path.join(tmpDir, "scorecard.html");
    const jsonPath = path.join(tmpDir, "scorecard.json");

    await generateScorecardHtml(scorecard, htmlPath);
    await generateScorecardJson(scorecard, jsonPath);

    const htmlContent = await fs.readFile(htmlPath, "utf-8");
    const jsonContent = await fs.readFile(jsonPath, "utf-8");

    expect(htmlContent).toContain("Warrant Siege: Safety Scorecard");
    expect(htmlContent).toContain("All 10 Invariants Satisfied");
    expect(htmlContent).toContain(scorecard.auditProofHash!);

    const parsedJson = JSON.parse(jsonContent);
    expect(parsedJson.allInvariantsSatisfied).toBe(true);
    expect(parsedJson.passedScenarios).toBe(11);
  }, 40000); // 40s timeout for all 11 scenarios
});
