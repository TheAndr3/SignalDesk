import { CasePriority } from '@signaldesk/shared';
import { decodeCursor, encodeCursor } from './cursor.util';

describe('cursor.util', () => {
  it('should encode and decode cursor correctly', () => {
    const priority = CasePriority.URGENT;
    const createdAt = '2026-08-14T00:00:00.000Z';
    const id = 'case-uuid-1234';

    const encoded = encodeCursor(priority, createdAt, id);
    expect(typeof encoded).toBe('string');

    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({
      priority: CasePriority.URGENT,
      createdAt: '2026-08-14T00:00:00.000Z',
      id: 'case-uuid-1234',
    });
  });

  it('serializes a Date value as an ISO timestamp', () => {
    const encoded = encodeCursor(
      CasePriority.HIGH,
      new Date('2026-08-14T00:00:00.000Z'),
      'case-uuid-1234',
    );

    expect(decodeCursor(encoded)?.createdAt).toBe('2026-08-14T00:00:00.000Z');
  });

  it('should return null for malformed base64 strings', () => {
    expect(decodeCursor('not-valid-base64-content!!')).toBeNull();
  });

  it('should return null for decoded strings with missing components', () => {
    const invalidRaw = Buffer.from('urgent|2026-08-14T00:00:00.000Z').toString('base64');
    expect(decodeCursor(invalidRaw)).toBeNull();
  });

  it('should return null for invalid priority enum values', () => {
    const invalidRaw = Buffer.from('super-urgent|2026-08-14T00:00:00.000Z|uuid-1').toString('base64');
    expect(decodeCursor(invalidRaw)).toBeNull();
  });
});
