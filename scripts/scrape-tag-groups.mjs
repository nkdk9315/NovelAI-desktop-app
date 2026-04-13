#!/usr/bin/env node
// Scrape Danbooru tag_groups wiki into src-tauri/resources/tag_groups.json
// and build character_groups.json from danbooru_tags.csv (category=4).
//
// Usage:
//   node scripts/scrape-tag-groups.mjs
//   node scripts/scrape-tag-groups.mjs --refresh   # bypass cache
//   node scripts/scrape-tag-groups.mjs --limit 5   # debug: first N groups only

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CACHE_DIR = resolve(REPO_ROOT, "scripts/.cache/wiki");
const RESOURCES_DIR = resolve(REPO_ROOT, "src-tauri/resources");
const CSV_PATH = resolve(RESOURCES_DIR, "danbooru_tags.csv");
const OUT_TAG_GROUPS = resolve(RESOURCES_DIR, "tag_groups.json");
const OUT_CHAR_GROUPS = resolve(RESOURCES_DIR, "character_groups.json");

const USER_AGENT = "NovelAI-desktop-app-scraper/0.1 (https://github.com/)";
const THROTTLE_MS = 1100;
const API_BASE = "https://danbooru.donmai.us/wiki_pages.json";

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function canonicalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function fetchWiki(title) {
  const slug = slugify(title);
  const cachePath = resolve(CACHE_DIR, `${slug}.json`);
  if (!REFRESH) {
    try {
      const cached = await readFile(cachePath, "utf8");
      return JSON.parse(cached);
    } catch {}
  }
  const url = `${API_BASE}?search%5Btitle%5D=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);
  const arr = await res.json();
  const page = arr[0];
  if (!page) throw new Error(`no wiki page: ${title}`);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath, JSON.stringify(page, null, 2));
  await sleep(THROTTLE_MS);
  return page;
}

// Parse a DText link body `target|display` → { target, display }.
function parseLink(raw) {
  const pipe = raw.indexOf("|");
  if (pipe === -1) return { target: raw.trim(), display: raw.trim() };
  const target = raw.slice(0, pipe).trim();
  const display = raw.slice(pipe + 1).trim();
  return { target, display: display || target };
}

const HEADING_RE = /^h([1-6])(?:#[^.\s]+)?\.\s+(.+?)\s*$/;
const BULLET_RE = /^(\*+)\s+(.*)$/;
const LINK_RE = /\[\[([^\]]+)\]\]/g;

function walkDText(body, onBullet) {
  const lines = body.split(/\r?\n/);
  const path = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const h = line.match(HEADING_RE);
    if (h) {
      const level = Number(h[1]);
      while (path.length && path[path.length - 1].level >= level) path.pop();
      path.push({ level, title: h[2] });
      continue;
    }
    const b = line.match(BULLET_RE);
    if (b) {
      onBullet({ depth: b[1].length, line: b[2], path: path.map((p) => p.title) });
    }
  }
}

// Parse tag_groups index — returns { target, display, path }[]
function parseIndex(body) {
  const groups = [];
  const seen = new Set();
  walkDText(body, ({ line, path }) => {
    // Skip TOC lines of the form `1. "Foo":#dtext-anchor`
    if (/^\d+\.\s+"/.test(line)) return;
    const m = line.match(/\[\[([^\]]+)\]\]/);
    if (!m) return;
    const { target, display } = parseLink(m[1]);
    if (path.length === 0) return;
    if (path.some((p) => /^see also$/i.test(p))) return;
    if (seen.has(target)) return;
    seen.add(target);
    groups.push({ target, display, path: [...path] });
  });
  return groups;
}

// Parse a group page — { tags, subsections }
function parseGroup(body) {
  const tags = [];
  const subsections = {};
  const seen = new Set();
  walkDText(body, ({ line, path }) => {
    const sub = path[path.length - 1] ?? "";
    if (/^related tag groups?$/i.test(sub) || /^see also$/i.test(sub)) return;
    const linksInLine = [...line.matchAll(LINK_RE)];
    for (const lm of linksInLine) {
      const { target } = parseLink(lm[1]);
      if (/^tag\s*group:/i.test(target)) continue;
      if (/^list of /i.test(target)) continue;
      const canon = canonicalize(target);
      if (!canon) continue;
      if (seen.has(canon)) continue;
      seen.add(canon);
      tags.push(canon);
      if (sub) (subsections[sub] ??= []).push(canon);
      break; // only the first/primary link per bullet counts as the tag
    }
  });
  return { tags, subsections };
}

async function buildCharacterGroups() {
  const works = {};
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let total = 0;
  for await (const line of rl) {
    if (!line) continue;
    const firstComma = line.indexOf(",");
    if (firstComma < 0) continue;
    const secondComma = line.indexOf(",", firstComma + 1);
    if (secondComma < 0) continue;
    const category = line.slice(firstComma + 1, secondComma);
    if (category !== "4") continue;
    const name = line.slice(0, firstComma);
    total++;
    const m = name.match(/^(.+?)_\((.+)\)$/);
    const work = m ? m[2] : "unknown_work";
    (works[work] ??= []).push(name);
  }
  const sortedWorks = Object.fromEntries(
    Object.entries(works)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v.sort()]),
  );
  return { total, works: sortedWorks };
}

async function main() {
  console.log(`[scrape] fetching index...`);
  const indexPage = await fetchWiki("tag_groups");
  const refs = parseIndex(indexPage.body);
  console.log(`[scrape] ${refs.length} group references found`);

  const limited = Number.isFinite(LIMIT) ? refs.slice(0, LIMIT) : refs;

  const groups = [];
  const tagIndex = {};
  let failed = 0;
  for (const [i, ref] of limited.entries()) {
    try {
      const page = await fetchWiki(ref.target);
      const { tags, subsections } = parseGroup(page.body);
      const id = slugify(ref.target.replace(/^tag\s*group:/i, ""));
      const title = ref.display.replace(/^tag\s*group:\s*/i, "");
      const entry = {
        id,
        title,
        source: ref.target,
        path: ref.path,
        tags,
        subsections,
      };
      groups.push(entry);
      for (const t of tags) (tagIndex[t] ??= []).push(id);
      process.stdout.write(
        `\r[scrape] ${i + 1}/${limited.length} ${ref.target.padEnd(40).slice(0, 40)} (${tags.length} tags)   `,
      );
    } catch (e) {
      failed++;
      console.warn(`\n[scrape] FAIL ${ref.target}: ${e.message}`);
    }
  }
  process.stdout.write("\n");

  for (const k of Object.keys(tagIndex)) tagIndex[k].sort();
  const sortedTagIndex = Object.fromEntries(
    Object.entries(tagIndex).sort(([a], [b]) => a.localeCompare(b)),
  );

  const out = {
    version: new Date().toISOString().slice(0, 10),
    source: "danbooru wiki tag_groups",
    groups,
    tagIndex: sortedTagIndex,
  };
  await mkdir(RESOURCES_DIR, { recursive: true });
  await writeFile(OUT_TAG_GROUPS, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `[scrape] wrote ${OUT_TAG_GROUPS} — ${groups.length} groups, ${Object.keys(sortedTagIndex).length} unique tags (failed: ${failed})`,
  );

  console.log(`[scrape] building character groups from CSV...`);
  try {
    await stat(CSV_PATH);
  } catch {
    console.warn(`[scrape] CSV not found at ${CSV_PATH} — skipping character groups`);
    return;
  }
  const charGroups = await buildCharacterGroups();
  const charOut = {
    version: new Date().toISOString().slice(0, 10),
    source: "danbooru_tags.csv (category=4)",
    works: charGroups.works,
  };
  await writeFile(OUT_CHAR_GROUPS, JSON.stringify(charOut, null, 2) + "\n");
  console.log(
    `[scrape] wrote ${OUT_CHAR_GROUPS} — ${Object.keys(charGroups.works).length} works, ${charGroups.total} character tags`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
