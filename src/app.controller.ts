import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { AppService, BalanceAdjustment, UserLogin, UserReg, asssetConversionRequest, usdConversionRequest } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Only returns minimal summaries so the browser isn't full of details it doesn't yet want.  
  // Assumes that a user will click through to prompt getAssetById for more details on individual assets.
  @Get("/assets")
  @Header('Content-type', 'application/json')
  async getAllAssets(): Promise<string> {
    const raw = await this.appService.getAllAssets();
    const summaries = raw.map(it => {
      return {
        id: it.id,
        name: it.name,
        symbol: it.symbol
      }
    });

    return JSON.stringify(summaries);
  }

  @Get("/assets/:id")
  @Header('Content-type', 'application/json')
  async getAssetById(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getAssetById(id))
  }

  @Get("/assets/USD/:id")
  @Header('Content-type', 'application/json')
  async assetPriceSpotCheck(@Param('id') id: string): Promise<string> {
    return JSON.stringify({
      assetId: id,
      usdPrice: await this.appService.convertAssetToUSD(id, 1)
    })
  }

  @Get("/wallets/myBalance/:id")
  @Header("Content-type", 'application/json')
  async getWalletBalance(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getWalletBalanceSummary(id));
  }

  @Get("/wallets/historicalBalances/:id")
  @Header("Content-type", "application/json")
  async getHistoricalWalletBalance(@Param('id') id: string): Promise<string> {
    return JSON.stringify(await this.appService.getWalletBalanceHistory(id));
  }

  @Post("/users/register")
  registerUser(@Body() userReg: UserReg): string {
    return this.appService.registerUser(userReg);
  }

  @Post("/users/login")
  @Header('Content-type', 'text/plain')
  loginUser(@Body() userLogin: UserLogin): string {
    return this.appService.loginUser(userLogin);
  }

  @Post("/users/logout")
  @Header('Content-type', 'text/plain')
  logoutUser(@Body() user: { userName: string }): string {
    return this.appService.logoutUser(user.userName);
  }

  @Post("/wallets/updateBalance")
  @Header('Content-type', 'text/plain')
  updateBalance(@Body() balanceAdjustmentDTO: BalanceAdjustment): string {
    return this.appService.updateBalance(balanceAdjustmentDTO);
  }

  @Post("/assets/convertToUSD")
  @Header('Content-type', 'text/plain')
  async convertToUsd(@Body() usdConversionRequest: usdConversionRequest): Promise<string> {
    return "Value in USD: " + await this.appService.convertAssetToUSD(usdConversionRequest.assetId, usdConversionRequest.assetQuantity);
  }

  @Post("/assets/convertToAsset")
  @Header('Content-type', 'text/plain')
  async convertToAsset(@Body() assetConversionRequest: asssetConversionRequest): Promise<string> {
    return "Can purchase " + await this.appService.convertUSDToAsset(assetConversionRequest.assetId, assetConversionRequest.usdQuantity) + " of asset with id \"" + assetConversionRequest.assetId + "\"";
  }

}
