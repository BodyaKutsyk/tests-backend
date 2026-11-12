import {
  iterateDocumentItems,
  isDocling,
  type ContentLayer,
  type DocItem,
  type DoclingDocument,
  type NodeItem,
  type TableItem,
} from '@docling/docling-core';

type BlockBase = {
  /** Original Docling node. Keep it so normalization never discards source data. */
  source: NodeItem;
  /** All provenance is retained; `page` is a convenience for existing consumers. */
  provenance?: DocItem['prov'];
  page?: number;
  contentLayer?: ContentLayer;
  /** Nesting depth reported by Docling's reading-order iterator. */
  level: number;
};

export type Block =
  | (BlockBase & {
      type: 'heading';
      text: string;
      headingLevel: number;
      label: 'title' | 'section_header';
    })
  | (BlockBase & {
      type: 'paragraph';
      text: string;
      label?: string;
    })
  | (BlockBase & {
      type: 'list_item';
      text: string;
      marker?: string;
      enumerated?: boolean;
    })
  | (BlockBase & {
      type: 'code';
      text: string;
      language?: string;
    })
  | (BlockBase & {
      type: 'table';
      /** Convenience projection for Markdown/table consumers. */
      headers: string[];
      rows: string[][];
      /** Full Docling table data, including cell spans, headers, and coordinates. */
      data: TableItem['data'];
    })
  | (BlockBase & {
      type: 'picture' | 'form' | 'key_value' | 'field' | 'other';
      text?: string;
      label?: string;
    });

const CONTENT_LAYERS: ContentLayer[] = [
  'body',
  'furniture',
  'background',
  'invisible',
  'notes',
];

function getText(node: NodeItem): string | undefined {
  if ('text' in node && typeof node.text === 'string') {
    const text = node.text.trim();
    return text || undefined;
  }
  return undefined;
}

function getBase(source: NodeItem, level: number): BlockBase {
  const docItem = source as DocItem;
  return {
    source,
    level,
    provenance: docItem.prov,
    page: docItem.prov?.[0]?.page_no,
    contentLayer: source.content_layer,
  };
}

export function normalizeDocling(document: DoclingDocument): Block[] {
  const blocks: Block[] = [];

  for (const [item, level] of iterateDocumentItems(document, {
    traversePictures: true,
    includedContentLayers: CONTENT_LAYERS,
  })) {
    const base = getBase(item, level);

    if (isDocling.CodeItem(item)) {
      const text = getText(item);
      if (text) {
        blocks.push({
          ...base,
          type: 'code',
          text,
          language: item.code_language,
        });
      }
      continue;
    }

    if (isDocling.ListItem(item)) {
      const text = getText(item);
      if (text) {
        blocks.push({
          ...base,
          type: 'list_item',
          text,
          marker: item.marker,
          enumerated: item.enumerated,
        });
      }
      continue;
    }

    if (isDocling.TableItem(item)) {
      const data = item.data;
      const grid = data.grid ?? [];
      const rows = grid.map((row) => row.map((cell) => cell.text ?? ''));

      blocks.push({
        ...base,
        type: 'table',
        headers: rows[0] ?? [],
        rows: rows.slice(1),
        data,
      });
      continue;
    }

    if (isDocling.PictureItem(item)) {
      const descriptions = [
        item.meta?.description?.text,
        item.meta?.code?.text,
        ...(item.annotations ?? [])
          .filter((annotation) => annotation.kind === 'description')
          .map((annotation) => annotation.text),
      ].filter((value): value is string => Boolean(value?.trim()));

      const chart = item.meta?.tabular_chart?.chart_data;
      if (chart) {
        descriptions.push(
          (chart.grid ?? [])
            .map((row) => row.map((cell) => cell.text ?? '').join('\t'))
            .join('\n'),
        );
      }

      blocks.push({
        ...base,
        type: 'picture',
        label: item.label,
        text: descriptions.join('\n'),
      });
      continue;
    }

    if (isDocling.FormItem(item)) {
      blocks.push({
        ...base,
        type: 'form',
        label: item.label,
        text: item.graph.cells
          .map((cell) => cell.text)
          .filter(Boolean)
          .join('\n'),
      });
      continue;
    }

    if (isDocling.KeyValueItem(item)) {
      blocks.push({
        ...base,
        type: 'key_value',
        label: item.label,
        text: item.graph.cells
          .map((cell) => cell.text)
          .filter(Boolean)
          .join('\n'),
      });
      continue;
    }

    if (isDocling.FieldItem(item) || isDocling.FieldRegionItem(item)) {
      blocks.push({
        ...base,
        type: 'field',
        label: item.label,
        text: getText(item),
      });
      continue;
    }

    if (isDocling.TextItem(item)) {
      const text = getText(item) ?? '';

      if (item.label === 'title' || item.label === 'section_header') {
        blocks.push({
          ...base,
          type: 'heading',
          text,
          label: item.label,
          headingLevel:
            item.label === 'title'
              ? 1
              : 'level' in item && typeof item.level === 'number'
                ? item.level
                : level + 1,
        });
      } else {
        blocks.push({
          ...base,
          type: 'paragraph',
          text,
          label: item.label,
        });
      }
      continue;
    }

    blocks.push({
      ...base,
      type: 'other',
      // @ts-ignore
      label: 'label' in item ? item.label : undefined,
      text: getText(item),
    });
  }

  return blocks;
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `${'#'.repeat(Math.max(1, block.headingLevel))} ${block.text}`;

        case 'paragraph':
          return block.text;

        case 'list_item':
          return `${'  '.repeat(Math.max(0, block.level - 1))}${block.marker ?? (block.enumerated ? '1.' : '-')} ${block.text}`;

        case 'code':
          return `\`\`\`${block.language ?? ''}\n${block.text}\n\`\`\``;

        case 'table': {
          const grid = block.data.grid ?? [];
          if (!grid.length) return '';

          const rows = grid.map((row) =>
            row.map((cell) => escapeCell(cell.text ?? '')),
          );
          const headers = rows[0] ?? [];
          const separator = headers.map(() => '---');
          return [headers, separator, ...rows.slice(1)]
            .map((row) => `| ${row.join(' | ')} |`)
            .join('\n');
        }

        case 'picture':
          return block.text || `[Picture: ${block.label ?? 'image'}]`;

        case 'form':
        case 'key_value':
        case 'field':
        case 'other':
          return block.text || '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}
