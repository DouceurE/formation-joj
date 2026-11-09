import { TRIP_NAME_MAX_LENGTH, TRIP_PHONE_MAX_LENGTH } from '@joj/shared';
import { normalizePhone } from './phone';
import { requiredText } from './trips.errors';

export interface BookingProps {
  id: string;
  bookingCode: string;
  tripId: string;
  passengerName: string;
  /** Sans espaces : c'est lui qui identifie le supporter. */
  passengerPhone: string;
  createdAt: Date;
}

export interface NewBooking {
  id: string;
  /** Tiré au hasard par le cas d'usage : le domaine ne touche pas au hasard. */
  bookingCode: string;
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  now: Date;
}

/** Une place réservée sur un trajet par un supporter, reconnu à son téléphone. */
export class Booking {
  private constructor(private readonly props: BookingProps) {}

  static create({
    id,
    bookingCode,
    tripId,
    passengerName,
    passengerPhone,
    now,
  }: NewBooking): Booking {
    return new Booking({
      id,
      bookingCode,
      tripId,
      passengerName: requiredText('passengerName', passengerName, TRIP_NAME_MAX_LENGTH),
      passengerPhone: normalizePhone(
        requiredText('passengerPhone', passengerPhone, TRIP_PHONE_MAX_LENGTH),
      ),
      createdAt: now,
    });
  }

  /** Reconstruit une réservation depuis la persistance, sans rejouer les règles de création. */
  static restore(props: BookingProps): Booking {
    return new Booking({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get bookingCode(): string {
    return this.props.bookingCode;
  }

  get tripId(): string {
    return this.props.tripId;
  }

  get passengerName(): string {
    return this.props.passengerName;
  }

  get passengerPhone(): string {
    return this.props.passengerPhone;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): BookingProps {
    return { ...this.props };
  }
}
