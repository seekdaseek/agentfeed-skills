#!/usr/bin/env node
// Offline checks of the skill package against the specifications it targets (NOTES.md has the URLs and the dates they were read):
//   agentskills.io SKILL.md rules, the Claude Code plugin / marketplace manifests, ClawHub's license and pricing rules, the "no key" rule.
// It then runs `claude plugin validate` (Claude Code's own validator) when the `claude` CLI is on PATH. `skills-ref validate` and `clawhub` are not run here.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const bad = (m) => errors.push(m);
const skillsDir = path.join(root, 'skills');
const names = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
if (!names.length) bad('no skill directory under skills/');

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  return m[1];
}
// a small YAML reader for the shapes this package uses: top-level scalars, one level of nested maps, block lists
function topKeys(fm) { return [...fm.matchAll(/^([A-Za-z][A-Za-z0-9_-]*):(?: (.*))?$/gm)].map((x) => [x[1], x[2]]); }

for (const name of names) {
  const dir = path.join(skillsDir, name);
  const file = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(file)) { bad(`${name}: SKILL.md is missing`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  const fm = frontmatter(text);
  if (!fm) { bad(`${name}: no YAML frontmatter`); continue; }
  const top = new Map(topKeys(fm));
  const ALLOWED = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
  for (const k of top.keys()) if (!ALLOWED.has(k)) bad(`${name}: frontmatter field "${k}" is not in the Agent Skills specification`);
  const fmName = (top.get('name') || '').trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fmName) || fmName.length > 64) bad(`${name}: name "${fmName}" breaks the name rules (1-64, lowercase letters, digits, single hyphens, no leading/trailing hyphen)`);
  if (fmName !== name) bad(`${name}: name "${fmName}" must match the parent directory`);
  const desc = (top.get('description') || '').trim();
  if (!desc || desc.length > 1024) bad(`${name}: description must be 1-1024 characters (is ${desc.length})`);
  if (!/\buse when\b/i.test(desc)) bad(`${name}: description should say when to use the skill`);
  const comp = (top.get('compatibility') || '').trim();
  if (comp && comp.length > 500) bad(`${name}: compatibility is over 500 characters`);
  if (!top.has('metadata')) bad(`${name}: metadata block missing`);
  if (text.split('\n').length >= 500) bad(`${name}: SKILL.md is ${text.split('\n').length} lines; keep it under 500`);
  // ClawHub: every published skill is MIT-0, no conflicting license, no pricing metadata
  const lic = (top.get('license') || '').trim();
  if (lic && lic !== 'MIT-0') bad(`${name}: license "${lic}" conflicts with ClawHub's MIT-0`);
  if (/^\s*(price|pricing|cost)\s*:/im.test(fm)) bad(`${name}: pricing metadata in the frontmatter (ClawHub does not take it)`);
  // generated block markers must be paired
  for (const tag of ['routes', 'passes']) if (!text.includes(`<!-- generated:begin ${tag} -->`) || !text.includes(`<!-- generated:end ${tag} -->`)) bad(`${name}: generated block "${tag}" markers missing`);
  // references one level deep, and they exist
  for (const m of text.matchAll(/\]\((references\/[^)#]+)\)/g)) if (!fs.existsSync(path.join(dir, m[1]))) bad(`${name}: linked file ${m[1]} does not exist`);
}

// the package never contains a key, a wallet secret or a personal address
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(root)) {
  if (f === fileURLToPath(import.meta.url) || f.endsWith('NOTES.md')) continue;   // this file holds the patterns; NOTES.md quotes specs
  const t = fs.readFileSync(f, 'utf8');
  if (/\bafk_[1-9A-HJ-NP-Za-km-z]{32,64}\b/.test(t)) bad(`${path.relative(root, f)}: contains something shaped like an AgentFeed key`);
  if (/[1-9A-HJ-NP-Za-km-z]{43,44}/.test(t.replace(/https?:\/\/\S+/g, ''))) bad(`${path.relative(root, f)}: contains a long base58 string (a key or an address?)`);
  if (/\b0x[0-9a-fA-F]{40}\b/.test(t)) bad(`${path.relative(root, f)}: contains an EVM address`);
  if (/@(gmail|proton|protonmail)\.|ochinimus@/i.test(t)) bad(`${path.relative(root, f)}: contains a personal email address`);
  if (/since \d{1,2} [A-Z][a-z]+ 20\d\d|since [A-Z][a-z]+ 20\d\d/.test(t)) bad(`${path.relative(root, f)}: states a start date`);
  if (/\b(buy|sell) (it|now|here|the dip)\b|\bgo (long|short)\b/i.test(t)) bad(`${path.relative(root, f)}: reads like a trade instruction`);
}

// manifests
const plugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
const market = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
if (!plugin.name || /^(claude|anthropic|anthropics|cc-plugin)-/.test(plugin.name)) bad('plugin.json: name missing or reserved');
if (!market.name || !market.owner || !market.owner.name || !Array.isArray(market.plugins)) bad('marketplace.json: name, owner.name and plugins[] are required');
for (const p of market.plugins || []) { if (!p.name || !p.source) bad('marketplace.json: every plugin needs a name and a source'); if (p.name !== plugin.name) bad(`marketplace entry "${p.name}" differs from plugin.json name "${plugin.name}"`); }
if (fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim() !== plugin.version) bad('plugin.json version differs from VERSION');

if (errors.length) { console.error(errors.map((e) => `FAIL ${e}`).join('\n')); process.exit(1); }
console.log(`offline checks pass: ${names.length} skill(s), plugin ${plugin.name}@${market.name}`);

try {
  const out = execFileSync('claude', ['plugin', 'validate', root], { encoding: 'utf8', timeout: 120000 });
  console.log(out.trim().split('\n').slice(-3).join('\n'));
} catch (e) {
  if (e.code === 'ENOENT') console.log('claude CLI not found: `claude plugin validate` NOT RUN');
  else { console.error(String(e.stdout || e.message).trim()); process.exit(1); }
}
