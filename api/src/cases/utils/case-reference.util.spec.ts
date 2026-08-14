import { formatCaseReference } from './case-reference.util';

describe('formatCaseReference', () => {
  it('should pad single digit references to 4 digits with CASE- prefix', () => {
    expect(formatCaseReference(1)).toBe('CASE-0001');
    expect(formatCaseReference(7)).toBe('CASE-0007');
  });

  it('should pad double and triple digit references correctly', () => {
    expect(formatCaseReference(42)).toBe('CASE-0042');
    expect(formatCaseReference(350)).toBe('CASE-0350');
  });

  it('should format 4 or more digits properly', () => {
    expect(formatCaseReference(1000)).toBe('CASE-1000');
    expect(formatCaseReference(12345)).toBe('CASE-12345');
  });
});
