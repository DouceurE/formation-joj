import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listOfficialLinesQuerySchema,
  type OfficialLineResponse,
  officialLineSchema,
} from '@joj/shared';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { ListOfficialLines } from '../application/use-cases/list-official-lines';

class ListOfficialLinesQueryDto extends createZodDto(listOfficialLinesQuerySchema) {}
class OfficialLineDto extends createZodDto(officialLineSchema) {}

/** Couche fine : les alternatives officielles d'un site, qui ne se réservent pas ici. */
@ApiTags('official-lines')
@Controller('official-lines')
export class OfficialLinesController {
  constructor(private readonly listOfficialLines: ListOfficialLines) {}

  @Get()
  @ZodSerializerDto([OfficialLineDto])
  list(@Query() query: ListOfficialLinesQueryDto): OfficialLineResponse[] {
    return this.listOfficialLines.execute(query).map((line) => ({ ...line }));
  }
}
