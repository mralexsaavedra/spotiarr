import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello(): string {
    return 'ONLINE';
  }

  @Get('version')
  getVersion(): { version: string } {
    return { version: process.env.npm_package_version || '0.1.0' };
  }
}
