import type { SpriteExportTarget, SpriteSpec } from "../spec";
import type { ExportEntry } from "./entries";

export interface AdapterInput {
  spec: SpriteSpec;
  entries: ExportEntry[];
  /** Variants are written as difference layers over their pose's base */
  layers: boolean;
  scale: number;
}

export interface AdapterOutput {
  /** One per exported entry (by entry name) */
  images: { name: string; relPath: string }[];
  texts: { relPath: string; content: string }[];
  /** Pack the entries into a texture atlas instead of separate files */
  atlas?: { name: string; relDir: string };
}

export type Adapter = (input: AdapterInput) => AdapterOutput;

export interface TargetInfo {
  id: SpriteExportTarget;
  /** The engine can stack a difference layer over the base (else layers are only in the generic manifest) */
  layers: boolean;
}

export const TARGETS: TargetInfo[] = [
  { id: "generic", layers: true },
  { id: "rpgmaker-mz", layers: false },
  { id: "rpgmaker-mv", layers: false },
  { id: "wolf", layers: false },
  { id: "tyrano", layers: true },
  { id: "kirikiri", layers: false },
  { id: "renpy", layers: true },
  { id: "unity", layers: false },
  { id: "godot", layers: false },
  { id: "unreal", layers: false },
  { id: "web-atlas", layers: true },
];

/** `hero` → `Hero` (class / plugin names) */
export const pascal = (s: string) => s.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Sprite";

export const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

export function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export const csv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
