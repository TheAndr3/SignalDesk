export function formatCaseReference(reference: number): string {
  return `CASE-${reference.toString().padStart(4, '0')}`;
}
