// Strict-parser tests for the SKILL.md frontmatter (run: npm install && npm test).
// The `yaml` package is the parser the skills CLI uses; on 30 Oct 2026 `npx skills add` refused b413fcb with
// "Nested mappings are not allowed in compact mappings at line 2, column 14" because the description was unquoted and holds "signal: what".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { quoteFrontmatter, parseStrict, splitFrontmatter } from './frontmatter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');
const skills = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
const VERSION = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();

test('every SKILL.md frontmatter parses with the strict yaml package, with no error and no warning, and its strings are strings', () => {
  assert.ok(skills.length >= 1);
  for (const name of skills) {
    const text = fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
    const parts = splitFrontmatter(text);
    assert.ok(parts, `${name}: frontmatter present`);
    const r = parseStrict(parts.fm);
    assert.deepEqual([r.errors, r.warnings], [[], []], `${name}: ${r.errors.concat(r.warnings).join('; ')}`);
    for (const k of ['name', 'description', 'license', 'compatibility']) assert.equal(typeof r.data[k], 'string', `${name}: ${k} is a string`);
    assert.equal(r.data.name, name);
    assert.match(r.data.description, /signal: what changed/, 'the description kept its colon and its words through the quoting');
    assert.equal(r.data.metadata.version, VERSION, 'the skill version is the VERSION file');
    assert.equal(r.data.metadata.openclaw.envVars[0].required, false, 'a boolean stays a boolean');
    assert.deepEqual(r.data.metadata.hermes.tags, ['crypto', 'market-data', 'briefs', 'x402'], 'a flow list is untouched');
  }
});

test('the plugin manifest carries the same version as the VERSION file', () => {
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version, VERSION);
});

test('negative control: the frontmatter b413fcb shipped (an unquoted description with "signal: what") is refused by the same strict check', () => {
  const old = '---\nname: x\ndescription: Use when an agent needs a perp signal: what changed overnight\nlicense: MIT-0\n---\nbody\n';
  const r = parseStrict(splitFrontmatter(old).fm);
  assert.ok(r.errors.length > 0, 'the check can fail');
  assert.match(r.errors.join(' '), /Nested mappings are not allowed in compact mappings/);
});

test('quoteFrontmatter turns that same frontmatter into one that parses, keeps the words, and is idempotent', () => {
  const old = '---\nname: x\ndescription: Use when an agent needs a perp signal: what changed overnight\nlicense: MIT-0\nmetadata:\n  flag: false\n  n: 3\n  tags: [a, b]\n  list:\n    - curl\n    - name: K\n      required: false\n---\nbody: not frontmatter\n';
  const q = quoteFrontmatter(old);
  const r = parseStrict(splitFrontmatter(q).fm);
  assert.deepEqual(r.errors, []);
  assert.equal(r.data.description, 'Use when an agent needs a perp signal: what changed overnight');
  assert.equal(r.data.license, 'MIT-0');
  assert.deepEqual(r.data.metadata, { flag: false, n: 3, tags: ['a', 'b'], list: ['curl', { name: 'K', required: false }] });
  assert.ok(q.endsWith('---\nbody: not frontmatter\n'), 'the body is untouched');
  assert.equal(quoteFrontmatter(q), q, 'idempotent');
});

test('quoteFrontmatter escapes a double quote and a backslash inside a value', () => {
  const q = quoteFrontmatter('---\nname: x\ndescription: say "hi" \\ there: ok\n---\n');
  assert.equal(parseStrict(splitFrontmatter(q).fm).data.description, 'say "hi" \\ there: ok');
});

test('generate.mjs --check finds no drift against the AgentFeed checkout (skipped when there is none beside this repo)', { skip: !fs.existsSync(path.join(root, '..', 'agentfeed', 'server.js')) && 'no ../agentfeed checkout' }, () => {
  const out = execFileSync(process.execPath, [path.join(root, 'scripts', 'generate.mjs'), '--check', '--repo', path.join(root, '..', 'agentfeed')], { encoding: 'utf8' });
  assert.match(out, /no drift/);
});
