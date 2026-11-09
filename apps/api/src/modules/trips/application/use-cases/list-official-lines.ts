import { Injectable } from '@nestjs/common';
import type { ListOfficialLinesQuery } from '@joj/shared';
import { type OfficialLine, officialLinesTo } from '../../domain/official-lines';

/** Les alternatives officielles d'un site : une liste fixe, sans repository. */
@Injectable()
export class ListOfficialLines {
  execute({ site }: ListOfficialLinesQuery): OfficialLine[] {
    return officialLinesTo(site);
  }
}
