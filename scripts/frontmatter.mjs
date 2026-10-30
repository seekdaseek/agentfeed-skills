// scripts/frontmatter.mjs: the SKILL.md frontmatter helpers shared by generate.mjs, validate.mjs and the strict-parser test.
//
// Why: b413fcb shipped `description: Use when an agent needs ... a perp signal: what changed ...` unquoted. A strict YAML parser (the `yaml` package, which the
// skills CLI uses) reads "signal: what" as a nested mapping and refuses the file: "Nested mappings are not allowed in compact mappings". The loose reader in
// validate.mjs accepted it, so nothing caught it before `npx skills add` did. generate.mjs now writes every plain string scalar of the frontmatter double-quoted.
import { parseDocument } from 'yaml';

export const splitFrontmatter = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : null;
};

const KEYLINE = /^(\s*(?:- )?[A-Za-z][\w-]*:)(?: (.*))?$/;    // `key: value`, `key:` (a block opener), `- key: value`
const ITEMLINE = /^(\s*- )(.+)$/;                              // `- value`
const KEEP = /^(["'\[{|>&*!#]|true$|false$|null$|~$|-?\d+(\.\d+)?$)/;   // already quoted, a flow collection, a block or anchor marker, a boolean, null or a number

const quoteValue = (v) => {
  const t = v.trim();
  return t === '' || KEEP.test(t) ? v : JSON.stringify(t);   // a JSON string is a valid YAML double-quoted scalar
};

/** Writes every plain string scalar of the frontmatter double-quoted; booleans, numbers, flow lists and already quoted values are left alone. Idempotent. */
export function quoteFrontmatter(text) {
  const s = splitFrontmatter(text);
  if (!s) throw new Error('no YAML frontmatter to quote');
  const lines = s.fm.split('\n').map((line) => {
    const k = KEYLINE.exec(line);
    if (k) return k[2] === undefined ? line : `${k[1]} ${quoteValue(k[2])}`;
    const i = ITEMLINE.exec(line);
    return i ? `${i[1]}${quoteValue(i[2])}` : line;
  });
  return `---\n${lines.join('\n')}\n---\n${s.body}`;
}

/** Strict parse with the `yaml` package: { data, errors, warnings } (errors and warnings are message strings). */
export function parseStrict(fmText) {
  const doc = parseDocument(fmText);
  return { data: doc.errors.length ? null : doc.toJS(), errors: doc.errors.map((e) => e.message.split('\n')[0]), warnings: doc.warnings.map((w) => w.message.split('\n')[0]) };
}
