import { isProfileBasicsValid, isValidAge } from './profile-limits';

describe('profile limits', () => {
  it('accepts ages between 18 and 120', () => {
    expect(isValidAge(18)).toBe(true);
    expect(isValidAge(120)).toBe(true);
    expect(isValidAge(17)).toBe(false);
    expect(isValidAge(121)).toBe(false);
    expect(isValidAge(25.5)).toBe(false);
    expect(isValidAge(null)).toBe(false);
    expect(isValidAge(undefined)).toBe(false);
  });

  it('requires name, city and a valid age', () => {
    expect(isProfileBasicsValid({ name: 'Alex', city: 'Madrid', age: 26 })).toBe(true);
    expect(isProfileBasicsValid({ name: '  ', city: 'Madrid', age: 26 })).toBe(false);
    expect(isProfileBasicsValid({ name: 'Alex', city: '', age: 26 })).toBe(false);
    expect(isProfileBasicsValid({ name: 'Alex', city: 'Madrid', age: 17 })).toBe(false);
  });
});
