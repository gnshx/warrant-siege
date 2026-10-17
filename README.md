# Warrant Siege 🛡️

**Adversarial Safety Test Harness & Scorecard Generator for Voice & MCP Agent Gateways**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Invariants](https://img.shields.io/badge/Invariants-11%2F11_Satisfied-brightgreen.svg)](#architectural-invariants)
[![MCP Spec](https://img.shields.io/badge/MCP-2025--11--25_Streamable_HTTP-purple.svg)](https://modelcontextprotocol.io)

Warrant Siege is a standalone adversarial testing tool designed to systematically attack Model Context Protocol (MCP) servers and safety gateways before they are put in front of voice assistants or customers.

It verifies 10 fundamental safety and financial invariants ($I_1 - I_{10}$) by executing 11 automated attack scenarios ($S_1 - S_{11}$) over real HTTP connections and generating interactive HTML/JSON scorecards and SVG badges.

---

## Quickstart (Standalone Usage)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/gnshx/warrant-siege.git
cd warrant-siege

# Install dependencies
npm install

# Build TypeScript CLI
npm run build
```

### 2. Run Adversarial Siege Against Your Gateway

```bash
# Target your running MCP Gateway over Streamable HTTP and Admin API:
node dist/cli.js --target http://localhost:8000/mcp --admin http://localhost:8000/admin
```

Options:
- `-t, --target <url>`: Target MCP endpoint URL (default: `http://localhost:8000/mcp`)
- `-a, --admin <url>`: Target Admin API URL (default: `http://localhost:8000/admin`)
- `-o, --out <path>`: HTML scorecard output file (default: `./scorecard.html`)
- `-j, --json <path>`: JSON report output file (default: `./scorecard.json`)
- `-b, --badge <path>`: SVG badge output file (default: `./scorecard-badge.svg`)

---

## 11 Core Adversarial Attack Scenarios

| Scenario | Attack Vector | Target Invariant | Expected Gateway Defense |
|---|---|---|---|
| **S1** | Duplicate Submit & Concurrency Storm | $I_1$ (No Duplicate External Effect) | 10 concurrent requests with identical key execute exactly once; 9 return cached state. |
| **S2** | Mid-Plan Partial Failure | $I_4$ (Clean Residue / Saga Rollback) | Provider failure aborts plan and automatically triggers reverse compensation. |
| **S3** | Spend Cap Overflow Attempt | $I_2$ (Absolute Spend Cap) | Transaction exceeding spend cap is blocked before provider dispatch. |
| **S4** | Parameter Tampering Post-Approval | $I_3$ (Cryptographic Approval Binding) | Canonical RFC 8785 hash mismatch rejects modified payload. |
| **S5** | Indirect Prompt Injection Attack | $I_5$ (Structural Output Containment) | Malicious provider response payload cannot elevate privileges or alter active grants. |
| **S6** | Expired & Revoked Grant Boundary | $I_6$ (Temporal Authorization Boundary) | Expired token returns HTTP 403 and rejects all action tiers ($T_0, T_1, T_2$). |
| **S7** | Unapproved High-Risk ($T_2$) Bypass | $I_3$ (Approval Requirement) | Irreversible write executed without phone approval token is rejected. |
| **S8** | Ambiguous Timeout & Reconciliation | $I_8$ (Reconciliation over Blind Retries) | Network drop triggers active reconciliation against provider truth, never blind retries. |
| **S9** | Signed Action Receipt Forgery | $I_9$ (Action Authenticity) | Modifying parameters, spend, or key causes offline Ed25519 verification failure. |
| **S10** | Pre-Settlement Grace-Hold Undo | $I_{10}$ (Undo Window Containment) | Cancellation during grace period cancels action with zero external provider effects. |
| **S11** | Cross-User Plan & Budget Isolation | $I_6$ (User Boundary & Isolation) | User B blocked with 403 Forbidden from accessing or executing User A's plan; budgets isolated across users. |

---

## CI Workflow Template

A reusable workflow template is provided in `ci/workflows/warrant-siege.yml` (copyable to `.github/workflows/` on repositories with GitHub Actions enabled):

```yaml
name: Security & Safety Siege
on: [push, pull_request]

jobs:
  siege:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install && npm run build
      - name: Run Siege Against Gateway
        run: node dist/cli.js --target http://localhost:8000/mcp --admin http://localhost:8000/admin --out scorecard.html --badge scorecard-badge.svg
      - uses: actions/upload-artifact@v4
        with:
          name: siege-scorecard
          path: scorecard.html
```

---

## License

Apache-2.0
