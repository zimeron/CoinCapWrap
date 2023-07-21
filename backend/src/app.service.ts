import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';


@Injectable()
export class AppService {
  constructor(private httpService: HttpService) {
  }

  async getAllAssets(): Promise<Asset[]> {
    return await firstValueFrom(this.httpService.get<Asset[]>("https://api.coincap.io/v2/assets")
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error.response.data);
        throw 'An error happened';
      })
    )).then(response => response.data);
  }

  async getAssetById(id: string): Promise<Asset> {
    return await firstValueFrom(this.httpService.get<Asset>("https://api.coincap.io/v2/assets/" + id)
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw error;
      })
    )).then(response => response.data);
  }
}

export interface Asset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  maxSuppply: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
  vwap24Hr: string;
}
