let counter = 0;

/** DOM id unique per component instance, for components rendered more than once on a page. */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
