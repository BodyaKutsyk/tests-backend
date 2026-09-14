import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @HttpCode(HttpStatus.OK)
  @Get('health')
  healthCheck() {
    return {
      uptime: `${Math.floor(process.uptime())} seconds`,
    };
  }

  @Get('database')
  testDatabase() {
    return this.appService.testDatabase();
  }
}
