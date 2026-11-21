export const MIN_PART_SIZE = 5 * 1024 * 1024;
const MAX_PARTS = 10_000;

export default function calculatePartSize(fileSize: number): number {
  const preferredSize = 5 * 1024 * 1024;

  return Math.max(
    MIN_PART_SIZE,
    preferredSize,
    Math.ceil(fileSize / MAX_PARTS),
  );
}
