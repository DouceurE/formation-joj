import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  bookingCodeParamsSchema,
  type BookingViewResponse,
  bookingViewSchema,
  cancelBookingSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import type { BookingView } from '../application/use-cases/booking-view';
import { CancelBooking } from '../application/use-cases/cancel-booking';
import { GetBooking } from '../application/use-cases/get-booking';

class CancelBookingDto extends createZodDto(cancelBookingSchema) {}
class BookingCodeParamsDto extends createZodDto(bookingCodeParamsSchema) {}
class BookingViewDto extends createZodDto(bookingViewSchema) {}

/** Couche fine : la réservation est désignée par son code, remis au supporter en TR2. */
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly cancelBooking: CancelBooking,
    private readonly getBooking: GetBooking,
  ) {}

  @Post('cancel')
  @HttpCode(200)
  @ZodSerializerDto(BookingViewDto)
  async cancel(@Body() body: CancelBookingDto): Promise<BookingViewResponse> {
    return toView(await this.cancelBooking.execute(body));
  }

  @Get(':code')
  @ZodSerializerDto(BookingViewDto)
  async get(@Param() { code }: BookingCodeParamsDto): Promise<BookingViewResponse> {
    return toView(await this.getBooking.execute(code));
  }
}

function toView({ booking, trip, status }: BookingView): BookingViewResponse {
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    status,
    tripId: trip.id,
    passengerName: booking.passengerName,
    departurePlace: trip.departurePlace,
    departureAt: trip.departureAt.toISOString(),
    driverPhone: trip.driverPhone,
    createdAt: booking.createdAt.toISOString(),
  };
}
