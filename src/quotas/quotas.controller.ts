import { Controller } from '@nestjs/common';
import { QuotasService } from './quotas.service.js';

@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}
}
