import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AppConfig } from '../src/core/config/app-config';
import { FakeTripExtractor } from '../src/modules/trips/application/testing/fake-trip-extractor';
import { TripExtractor } from '../src/modules/trips/application/trip-extractor';

/**
 * L'application complète, sur une base PGlite en mémoire neuve, migrations appliquées.
 * L'assistant IA est remplacé par un faux : aucun test n'appelle Claude, ni ne paie.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AppConfig)
    .useValue(AppConfig.fromEnv({ NODE_ENV: 'test', PGLITE_DATA_DIR: 'memory://' }))
    .overrideProvider(TripExtractor)
    .useValue(new FakeTripExtractor())
    .compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  return app;
}
