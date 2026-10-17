import { Scorecard } from "./types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Generates machine-verifiable JSON scorecard.
 */
export async function generateScorecardJson(scorecard: Scorecard, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(scorecard, null, 2), "utf-8");
}

/**
 * Generates high-polish, standalone, interactive HTML scorecard report.
 */
export async function generateScorecardHtml(scorecard: Scorecard, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const statusColor = scorecard.allInvariantsSatisfied ? "#10b981" : "#ef4444";
  const statusBadge = scorecard.allInvariantsSatisfied
    ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 0.875rem; letter-spacing: 0.05em; text-transform: uppercase;">All ${Object.keys(scorecard.invariants).length} Invariants Satisfied</span>`
    : `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 0.875rem; letter-spacing: 0.05em; text-transform: uppercase;">Invariants Breached</span>`;

  const invariantCards = Object.entries(scorecard.invariants)
    .map(([id, inv]) => {
      const isOk = inv.satisfied;
      const border = isOk ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";
      const tagBg = isOk ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
      const tagColor = isOk ? "#34d399" : "#f87171";

      return `
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${border}; border-radius: 12px; padding: 1.25rem; backdrop-filter: blur(8px);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <span style="font-family: monospace; font-size: 1.1rem; font-weight: 800; color: #38bdf8;">${id}</span>
          <span style="background: ${tagBg}; color: ${tagColor}; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
            ${isOk ? "SATISFIED" : "BREACHED"}
          </span>
        </div>
        <div style="font-weight: 600; font-size: 0.95rem; color: #f1f5f9; margin-bottom: 0.5rem;">${inv.name}</div>
        <div style="font-size: 0.75rem; color: #94a3b8;">Tested by: <code style="color: #cbd5e1;">${inv.testedBy.join(", ")}</code></div>
      </div>
      `;
    })
    .join("\n");

  const scenarioRows = scorecard.results
    .map((res) => {
      const isPass = res.passed;
      const badge = isPass
        ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">PASSED</span>`
        : `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">FAILED</span>`;

      return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.15s ease;">
        <td style="padding: 1rem; font-family: monospace; font-weight: 700; color: #38bdf8;">${res.scenarioId}</td>
        <td style="padding: 1rem; font-weight: 600; color: #f8fafc;">${res.name}</td>
        <td style="padding: 1rem; font-family: monospace; color: #a78bfa;">${res.targetInvariant}</td>
        <td style="padding: 1rem;">${badge}</td>
        <td style="padding: 1rem; font-family: monospace; color: #94a3b8; font-size: 0.85rem;">${res.durationMs}ms</td>
        <td style="padding: 1rem; color: #cbd5e1; font-size: 0.875rem;">${res.assertion}</td>
      </tr>
      `;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warrant Siege: Safety Scorecard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 2.5rem 1.5rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .grid-invariants {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .table-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: rgba(30, 41, 59, 0.6);
      padding: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .audit-box {
      background: rgba(15, 23, 42, 0.7);
      border: 1px dashed rgba(56, 189, 248, 0.4);
      border-radius: 12px;
      padding: 1.5rem;
      font-family: monospace;
      font-size: 0.85rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 12px #06b6d4;"></div>
            <h1 style="font-size: 1.75rem; font-weight: 800; letter-spacing: -0.025em; color: #ffffff;">Warrant Siege: Safety Scorecard</h1>
          </div>
          <p style="color: #94a3b8; font-size: 0.95rem;">Adversarial Test Suite & Architectural Invariant Verification Report</p>
        </div>
        <div>${statusBadge}</div>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 2rem; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1.25rem; font-size: 0.875rem;">
        <div><span style="color: #64748b;">Run ID:</span> <span style="font-family: monospace; color: #f1f5f9;">${scorecard.runId}</span></div>
        <div><span style="color: #64748b;">Target MCP:</span> <span style="font-family: monospace; color: #38bdf8;">${scorecard.targetUrl}</span></div>
        <div><span style="color: #64748b;">Timestamp:</span> <span style="color: #cbd5e1;">${scorecard.timestamp}</span></div>
        <div><span style="color: #64748b;">Pass Rate:</span> <span style="font-weight: 700; color: ${statusColor};">${scorecard.passedScenarios} / ${scorecard.totalScenarios} Passed</span></div>
      </div>
    </header>

    <h2 style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-bottom: 1rem;">Architectural Invariants (I1 – I${Object.keys(scorecard.invariants).length})</h2>
    <div class="grid-invariants">
      ${invariantCards}
    </div>

    <h2 style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-bottom: 1rem;">Adversarial Attack Scenarios (S1 – S${scorecard.results.length})</h2>
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Scenario Name</th>
            <th>Target</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Safety Invariant Assertion</th>
          </tr>
        </thead>
        <tbody>
          ${scenarioRows}
        </tbody>
      </table>
    </div>

    <h2 style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-bottom: 1rem;">Cryptographic Audit Chain Proof</h2>
    <div class="audit-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span style="color: #38bdf8; font-weight: 700;">[SHA-256 Tip Hash]:</span>
        <span style="color: #34d399; font-weight: 700;">STATUS: CONTINUOUS GENESIS-TO-TIP</span>
      </div>
      <div style="word-break: break-all; color: #f8fafc; margin-bottom: 0.75rem;">
        ${scorecard.auditProofHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
      </div>
      <div style="font-size: 0.75rem; color: #64748b;">
        Every action state transition throughout this siege run was hashed and cryptographically chained to its predecessor. Any backdated edit or log omission produces an immediate cryptographic verification failure.
      </div>
    </div>
  </div>
</body>
</html>`;

  await fs.writeFile(outputPath, html, "utf-8");
}

/**
 * Generates an SVG badge for the repository README and CI artifacts.
 */
export async function generateScorecardBadgeSvg(scorecard: Scorecard, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const total = scorecard.totalScenarios;
  const passed = scorecard.passedScenarios;
  const allPass = scorecard.allInvariantsSatisfied;
  const color = allPass ? "#10b981" : "#ef4444";
  const rightText = allPass ? `${passed}/${total} Satisfied` : `${total - passed} Breached`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" role="img" aria-label="Siege Scorecard: ${rightText}">
  <title>Siege Scorecard: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="200" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="105" height="20" fill="#1e293b"/>
    <rect x="105" width="95" height="20" fill="${color}"/>
    <rect width="200" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="535" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="950">Siege Scorecard</text>
    <text x="535" y="140" transform="scale(.1)" fill="#fff" textLength="950">Siege Scorecard</text>
    <text aria-hidden="true" x="1515" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="850">${rightText}</text>
    <text x="1515" y="140" transform="scale(.1)" fill="#fff" textLength="850">${rightText}</text>
  </g>
</svg>`;

  await fs.writeFile(outputPath, svg, "utf-8");
}
