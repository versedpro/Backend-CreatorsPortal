export function toNumber(value: string | number, radix?: number): number {
  if(typeof value === 'number') {
    return value;
  }
  return parseInt(value, radix);
}
