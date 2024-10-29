export function mapPriorityToNumber(priority: 'low' | 'medium' | 'high'): number {
  switch (priority) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    default:
      return 2; // Default to 'medium' if unrecognized
  }
}
