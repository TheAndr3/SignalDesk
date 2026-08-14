import { CasePriority } from '@signaldesk/shared';

export interface DecodedCursor {
  priority: CasePriority;
  createdAt: string;
  id: string;
}

export function encodeCursor(
  priority: CasePriority,
  createdAt: string | Date,
  id: string,
): string {
  const timestamp = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const raw = `${priority}|${timestamp.toISOString()}|${id}`;
  return Buffer.from(raw, 'utf-8').toString('base64');
}

export function decodeCursor(cursor: string): DecodedCursor | null {
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf-8');
    const parts = raw.split('|');
    if (parts.length !== 3) {
      return null;
    }
    const [priorityStr, createdAt, id] = parts;
    const priority = priorityStr as CasePriority;

    if (!Object.values(CasePriority).includes(priority)) {
      return null;
    }
    if (!createdAt || !id) {
      return null;
    }

    return { priority, createdAt, id };
  } catch {
    return null;
  }
}
