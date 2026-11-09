/** Deux téléphones qui ne diffèrent que par leurs espaces sont le même : « 78 555 66 77 » = « 785556677 ». */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}
