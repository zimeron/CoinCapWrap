import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { AppService, AssetSummary, BalanceAdjustmentDTO, UserLogin, UserReg, WalletBalanceSummary } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/assets")
  @Header('Content-type', 'application/json')
  async getAllAssets(): Promise<string> {
    return JSON.stringify(async () => {
      const detailedAssets = await this.appService.getAllAssets();
      return detailedAssets.map(it => {
        let summary: AssetSummary = {
          id: it.id,
          name: it.name,
          symbol: it.symbol
        }
      })
    });
  }

  @Get("/assets/:id")
  @Header('Content-type', 'application/json')
  async getAssetById(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getAssetById(id))
  }

  @Get("/assets/USD/:id")
  @Header('Content-type', 'application/json')
  async getUsdValuePerAsset(@Param('id') id: string): Promise<string> {
    return JSON.stringify({
      assetId: id,
      usdPrice: (await this.appService.getAssetById(id)).priceUsd
    })
  }

  @Get("/wallets/myBalance/:id")
  @Header("Content-type", 'application/json')
  async getWalletBalance(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getWalletBalanceSummary(id));
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
