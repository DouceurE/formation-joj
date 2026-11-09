import {
  TRIP_DEPARTURE_PLACE_MAX_LENGTH,
  TRIP_PHONE_MAX_LENGTH,
  TRIP_SITES,
  TRIP_VEHICLES,
  type TripSite,
  type TripVehicle,
  VEHICLE_MAX_SEATS,
} from '@joj/shared';
import type { Booking } from './booking';
import { requiredText, tripAlreadyBooked, TripError, tripFull } from './trips.errors';

export interface TripProps {
  id: string;
  managementCode: string;
  vehicle: TripVehicle;
  departurePlace: string;
  site: TripSite;
  departureAt: Date;
  seats: number;
  priceFcfa: number;
  driverPhone: string;
  /** Les téléphones, sans espaces, des supporters qui ont déjà réservé. */
  passengerPhones: readonly string[];
  createdAt: Date;
}

export interface NewTrip {
  id: string;
  /** Tiré au hasard par le cas d'usage : le domaine ne touche pas au hasard. */
  managementCode: string;
  /** Vérifiés ici : le domaine ne fait pas confiance à la validation HTTP. */
  vehicle: string;
  departurePlace: string;
  site: string;
  departureAt: Date;
  seats: number;
  priceFcfa: number;
  driverPhone: string;
  now: Date;
}

/** Un départ vers un site des JOJ : des places dans les limites du véhicule, jamais dans le passé. */
export class Trip {
  private constructor(private props: TripProps) {}

  static create(input: NewTrip): Trip {
    if (input.departureAt.getTime() < input.now.getTime()) {
      throw new TripError('DEPARTURE_IN_PAST', 'A trip cannot depart in the past', {
        departureAt: input.departureAt.toISOString(),
      });
    }
    const vehicle = validVehicle(input.vehicle);
    return new Trip({
      id: input.id,
      managementCode: input.managementCode,
      vehicle,
      departurePlace: requiredText(
        'departurePlace',
        input.departurePlace,
        TRIP_DEPARTURE_PLACE_MAX_LENGTH,
      ),
      site: validSite(input.site),
      departureAt: input.departureAt,
      seats: validSeats(vehicle, input.seats),
      priceFcfa: validPrice(input.priceFcfa),
      driverPhone: requiredText('driverPhone', input.driverPhone, TRIP_PHONE_MAX_LENGTH),
      passengerPhones: [],
      createdAt: input.now,
    });
  }

  /** Reconstruit un trajet depuis la persistance, sans rejouer les règles de création. */
  static restore(props: TripProps): Trip {
    return new Trip({ ...props, passengerPhones: [...props.passengerPhones] });
  }

  get id(): string {
    return this.props.id;
  }

  get managementCode(): string {
    return this.props.managementCode;
  }

  get vehicle(): TripVehicle {
    return this.props.vehicle;
  }

  get departurePlace(): string {
    return this.props.departurePlace;
  }

  get site(): TripSite {
    return this.props.site;
  }

  get departureAt(): Date {
    return this.props.departureAt;
  }

  get seats(): number {
    return this.props.seats;
  }

  get passengerPhones(): readonly string[] {
    return this.props.passengerPhones;
  }

  get remainingSeats(): number {
    return this.props.seats - this.props.passengerPhones.length;
  }

  get priceFcfa(): number {
    return this.props.priceFcfa;
  }

  get driverPhone(): string {
    return this.props.driverPhone;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): TripProps {
    return { ...this.props, passengerPhones: [...this.props.passengerPhones] };
  }

  /** Prend une place. La persistance revérifie sous verrou, pour deux réservations simultanées. */
  book(booking: Booking, now: Date): void {
    if (this.props.departureAt.getTime() < now.getTime()) {
      throw new TripError('TRIP_ALREADY_DEPARTED', 'This trip has already departed', {
        id: this.props.id,
        departureAt: this.props.departureAt.toISOString(),
      });
    }
    if (this.props.passengerPhones.includes(booking.passengerPhone)) {
      throw tripAlreadyBooked(this.props.id);
    }
    if (this.remainingSeats <= 0) throw tripFull(this.props.id, this.props.seats);
    this.props = {
      ...this.props,
      passengerPhones: [...this.props.passengerPhones, booking.passengerPhone],
    };
  }
}

function validVehicle(vehicle: string): TripVehicle {
  if (!(TRIP_VEHICLES as readonly string[]).includes(vehicle)) {
    throw new TripError('TRIP_VEHICLE_UNKNOWN', `Unknown vehicle ${vehicle}`, {
      vehicle,
      allowed: TRIP_VEHICLES,
    });
  }
  return vehicle as TripVehicle;
}

function validSite(site: string): TripSite {
  if (!(TRIP_SITES as readonly string[]).includes(site)) {
    throw new TripError('TRIP_SITE_UNKNOWN', `Unknown site ${site}`, {
      site,
      allowed: TRIP_SITES,
    });
  }
  return site as TripSite;
}

function validSeats(vehicle: TripVehicle, seats: number): number {
  const max = VEHICLE_MAX_SEATS[vehicle];
  if (!Number.isInteger(seats) || seats < 1 || seats > max) {
    throw new TripError('SEATS_OUT_OF_RANGE', `A ${vehicle} has 1 to ${max} seats`, {
      vehicle,
      seats,
      min: 1,
      max,
    });
  }
  return seats;
}

function validPrice(priceFcfa: number): number {
  if (!Number.isInteger(priceFcfa) || priceFcfa < 0) {
    throw new TripError('TRIP_PRICE_INVALID', 'A price is a whole number of FCFA, 0 or more', {
      priceFcfa,
    });
  }
  return priceFcfa;
}
