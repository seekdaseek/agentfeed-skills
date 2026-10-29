// Prints the brief routes, prices and pass terms as JSON, read from the AgentFeed code itself (payments.js PRICES, lib/keys.js, tools/briefs/config.js).
// Run by scripts/generate.mjs:  node --require <repo>/test/helpers/af-test-preload.js extract-facts.cjs   (cwd = a scratch dir; the preload keeps the
// box-only databases from being needed and refuses every outbound connection). Nothing here is typed by hand.
'use strict';
const path = require('path');
const repo = process.env.AF_ROOT;
const { PRICES } = require(path.join(repo, 'payments.js'));
const KL = require(path.join(repo, 'lib/keys.js'));
const BC = require(path.join(repo, 'tools/briefs/config.js'));
const Q = require(path.join(repo, 'tools/questions.js'));
const T = require(path.join(repo, 'tools/titles.js'));
const D = require(path.join(repo, 'tools/discovery.js'));
const routes = BC.soldRoutes().map((r) => {
  const p = PRICES[`GET ${r}`];
  return { route: r, tool: p.tool, usd: p.usd, desc: p.desc, question: Q.questionFor(p.tool), title: T.TOOL_TITLES[p.tool], sample: `/api/sample/${r.replace('/api/', '')}` };
});
const pass = (k) => ({ id: k.id, label: k.label, usd: k.usd, days: k.days, path: k.path, tool: k.tool, routes: k.allow, pace_s: Object.values(k.pace)[0] / 1000, body: KL.exampleBody(k.tool) });
console.log(JSON.stringify({ origin: D.ORIGIN, routes, passes: [pass(KL.BRIEF_PASS), pass(KL.BRIEF_DAY_PASS)], header: 'X-AgentFeed-Key', keys_page: '/keys',
  news_flag: BC.newsOn(), all_brief_routes: BC.ALL_ROUTES }));
