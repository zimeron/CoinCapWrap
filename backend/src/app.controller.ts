import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { AppService, BalanceAdjustmentDTO, UserLogin, UserReg } from './app.service';

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
  async getAssetById(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getAssetById(id))
  }

  @Get("/assets/priceUsd/:id")
  @Header('Content-type', 'application/json')
  async getUsdValuePerAsset(@Param('id') id: string): Promise<string> {
    return JSON.stringify({
      assetId: id,
      usdPrice: await this.appService.getUsdValuePerAsset(id)
    })
  }

  @Post("/users/register")
  registerUser(@Body() userReg: UserReg): void {
    this.appService.registerUser(userReg);
  }

  @Post("/users/login")
  @Header('Content-type', 'text/plain')
  loginUser(@Body() userLogin: UserLogin): string {
    return this.appService.loginUser(userLogin);
  }

  @Post("/wallets/updateBalance")
  @Header('Content-type', 'text/plain')
  updateBalance(@Body() balanceAdjustmentDTO: BalanceAdjustmentDTO): string {
    return this.appService.updateBalance(balanceAdjustmentDTO);
  }

}
