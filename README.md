# agentfeed-skills

One skill, `agentfeed-briefs`, for the [AgentFeed](https://x402.ochinimus.app) market-data API: three short crypto briefs (and the perp signal routes beside them) (the morning brief for BTC, ETH, SOL and HYPE, unusual moves across Hyperliquid perps, and funding / liquidation / open-interest anomalies). Each brief gives the judgment and the one level to watch, not a raw number, and says what it could not read.

The skill's point is the scheduled run. A cron job or an unattended agent cannot approve an x402 payment, so it sends a signals pass (one flat key for the briefs and the perp signal routes) or a prepaid key from the environment variable `AGENTFEED_KEY` as the header `X-AgentFeed-Key`: no payment prompt. An attended agent can pay per call with x402 instead.

```
skills/agentfeed-briefs/
  SKILL.md                      the instructions (Agent Skills format)
  references/ROUTES.md          routes, prices and pass terms, generated from the AgentFeed code
  references/SCHEDULING.md      cron, Hermes Agent and Claude Code examples
.claude-plugin/plugin.json      Claude Code plugin manifest
.claude-plugin/marketplace.json Claude Code marketplace (this repository is its own marketplace)
scripts/generate.mjs            builds the skill's facts from the AgentFeed code; --check fails on drift
scripts/validate.mjs            offline checks of the package, then `claude plugin validate`
```

The skill is one folder, `skills/agentfeed-briefs`, so each store reads the same files:

| Store | How it reads this repository |
|---|---|
| skills.sh | `npx skills add seekdaseek/agentfeed-skills --skill agentfeed-briefs` (finds `skills/<name>/SKILL.md`) |
| Claude Code | `claude plugin marketplace add seekdaseek/agentfeed-skills`, then `claude plugin install agentfeed@agentfeed-skills` |
| Hermes Agent | `hermes skills install seekdaseek/agentfeed-skills/skills/agentfeed-briefs` |
| ClawHub | publish the folder `skills/agentfeed-briefs` (ClawHub licenses every skill published there under MIT-0, which the skill's license line already says) |

The skill never contains a key. Prices and pass terms in it are generated, so they follow the service; the live 402 challenge of each route is the authority.

## Keeping it true

```bash
node scripts/generate.mjs --repo ../agentfeed      # regenerate after the AgentFeed routes or prices change
node scripts/generate.mjs --check --repo ../agentfeed   # exits 1 and names any file that has drifted
npm install && npm test         # parses SKILL.md's frontmatter with the strict yaml package (the parser the skills CLI uses)
node scripts/validate.mjs
```

The repository is MIT, Copyright (c) 2026 ochinimus (see `LICENSE`). The skill folder `skills/agentfeed-briefs` is offered under MIT-0, which its `license:` line says: ClawHub licenses every skill published there under MIT-0 and allows no override, and HermesHub asks for a license line.
