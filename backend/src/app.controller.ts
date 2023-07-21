import { Controller, Get, Header, Param } from '@nestjs/common';
import { AppService, Asset } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/assets")
  @Header('Content-type', 'application/json')
  async getAllAssets(): Promise<string> {
    return JSON.stringify(await this.appService.getAllAssets());
  }

  @Get("/assets/:id")
  @Header('Content-type', 'application/json')
  async getAssetById(@Param('id') id): Promise<string> {
    return JSON.stringify(await this.appService.getAssetById(id))
  }
}
