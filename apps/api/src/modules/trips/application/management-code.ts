import { randomInt } from 'node:crypto';
import { TRIP_MANAGEMENT_CODE_LENGTH } from '@joj/shared';

/** Sans 0, O, 1 ni I : un code lu au téléphone ne doit pas prêter à confusion. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Le code remis au conducteur pour gérer son trajet (TR3). */
export function generateManagementCode(): string {
  let code = '';
  for (let i = 0; i < TRIP_MANAGEMENT_CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Le code remis au supporter pour gérer sa réservation (TR3). */
export function generateBookingCode(): string {
  return generateManagementCode();
}
