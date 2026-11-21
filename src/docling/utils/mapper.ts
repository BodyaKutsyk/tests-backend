import { readFile } from 'node:fs/promises';
import type { InBodyConversionResponse } from '@docling/docling-client';

export async function readPlainTextMarkdown(filePath: string): Promise<string> {
  const markdown = await readFile(filePath, 'utf8');
  if (!markdown.trim()) throw new Error(`Empty document: ${filePath}`);
  return markdown;
}

export function toMarkdown(response: InBodyConversionResponse): string {
  if (!('document' in response)) {
    throw new Error('Docling returned a non-document result');
  }
  if (!['success', 'partial_success'].includes(response.status)) {
    throw new Error(
      `Docling conversion failed: ${response.errors.map((error) => error.error_message).join('; ')}`,
    );
  }
  return response.document.md_content ?? '';
}
