import { Test, TestingModule } from '@nestjs/testing';
import { QuotasController } from './quotas.controller.js';
import { QuotasService } from './quotas.service.js';

describe('QuotasController', () => {
  let controller: QuotasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotasController],
      providers: [QuotasService],
    }).compile();

    controller = module.get<QuotasController>(QuotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
