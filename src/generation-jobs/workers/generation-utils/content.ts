import { GENERATION_CONFIG as config } from './config.js';

type Script = 'cyrillic' | 'latin';

export function splitContent(content: string): string[] {
  const chunks: string[] = [];
  let current = '';
  const parts = content.split(/(?<=\n)|(?<=[.!?])\s+/u);
  for (const part of parts) {
    if (current && current.length + part.length > config.chunkSize) {
      chunks.push(current.trim());
      current = '';
    }
    if (part.length > config.chunkSize) {
      for (let start = 0; start < part.length; start += config.chunkSize) {
        chunks.push(part.slice(start, start + config.chunkSize).trim());
      }
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function countScripts(text: string): Record<Script, number> {
  return {
    cyrillic: (text.match(/\p{Script=Cyrillic}/gu) ?? []).length,
    latin: (text.match(/\p{Script=Latin}/gu) ?? []).length,
  };
}

export function dominantScript(content: string): Script | null {
  const counts = countScripts(content);
  if (counts.cyrillic > counts.latin * config.scriptRatio) return 'cyrillic';
  if (counts.latin > counts.cyrillic * config.scriptRatio) return 'latin';
  return null;
}

export function hasWrongScript(text: string, script: Script | null): boolean {
  if (!script) return false;
  const counts = countScripts(text);
  const other = script === 'cyrillic' ? counts.latin : counts.cyrillic;
  return (
    other >= config.minForeignCharacters &&
    other > counts[script] * config.scriptRatio
  );
}

export function selectChunkIndex(
  attempt: number,
  chunkCount: number,
  plannedBatches: number,
): number {
  if (chunkCount < plannedBatches) return attempt % chunkCount;
  const position = Math.floor(
    ((attempt % plannedBatches) * chunkCount) / plannedBatches,
  );
  return (position + Math.floor(attempt / plannedBatches)) % chunkCount;
}
