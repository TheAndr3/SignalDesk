import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DATABASE_CONNECTION } from './database/database.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue({ destroy: jest.fn() })
      .compile();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should compile the module successfully', () => {
    expect(module).toBeDefined();
  });
});
