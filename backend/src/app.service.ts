import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { readFile, readFileSync, writeFile, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { compareSync, hashSync } from 'bcrypt';

@Injectable()
export class AppService {
  private coinCapUrl: string = "https://api.coincap.io/v2";

  constructor(private httpService: HttpService) {
  }

  // Only returns a small summary with name, id, and symbol.  Assumes user will use getAssetById for more details
  // That way we're only loading the minimum, and waiting on a click-through to grab the full data set
  async getAllAssets(): Promise<AssetSummary[]> {
    return await firstValueFrom(this.httpService.get<AssetSummary[]>(this.coinCapUrl + "/assets")
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error.response.data);
        throw 'An error happened';
      })
    )).then(response => response.data);
  }

  async getAssetById(id: string): Promise<AssetDetails> {
    return await firstValueFrom(this.httpService.get<AssetDetails>(this.coinCapUrl + "/assets/" + id)
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw error;
      })
    )).then(response => response.data);
  }

  async getUsdValuePerAsset(id: string): Promise<number> {
    return await firstValueFrom(this.httpService.get<AssetDetails>(this.coinCapUrl + "/assets/" + id)
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw error;
      })
    )).then(response => +response.data.priceUsd);
  }

  private async getAssetValueUsd(assetAmount: number, id: string): Promise<number> {
    const asset = await this.getAssetById(id);
    return +asset.priceUsd * assetAmount;
  }

  public async registerUser(userReg: UserReg): Promise<void> {
    const userId = uuidv4();

    const user: User = {
      ...userReg,
      id: userId,
      walletId: await this.createWallet(userId),
      password: hashSync(userReg.password, 10)
    }

    readFile('resources/RegUsers.json', (err, data) => {
      if (err) throw err; 

      let users = JSON.parse(data.toString()) as User[];
      users.push(user);

      writeFile('resources/RegUsers.json', JSON.stringify(users), (err) => {
        if (err) throw err;
        console.log('User successfully registered');
      })
    })
  }

  public loginUser(userLogin: UserLogin): string {
    //set up session or send back token or something?

    const users = JSON.parse(readFileSync('resources/RegUsers.json').toString()) as User[];
    const user = users.find(it => it.username = userLogin.username);

    return compareSync(userLogin.password, user.password) ? "Login successful" : "Invalid password";
  }
  
  // Used to generate a wallet automatically for a new user when they register
  private async createWallet(userId: string): Promise<string> {
    const walletId = uuidv4();

    readFile('resources/Wallets.json', (err, data) => {
      if (err) throw err;
      
      const wallet: Wallet = {
        id: walletId,
        userId: userId,
        assets: []
      }

      let wallets = JSON.parse(data.toString()) as Wallet[];
      wallets.push(wallet);

      writeFile('resources/Wallets.json', JSON.stringify(wallets), (err) => {
        if (err) throw err;
        console.log('Wallet created for new user' + userId);
      })
    });

    return walletId;
  }

  // TODO: actual error codes
  // Updates balance of a given asset in a given wallet.  Assumes that requests to lower asset balance come from a frontend as negative numbers in balanceAdjustment.
  public updateBalance(dto: BalanceAdjustmentDTO): string {
    // Short circuit the inevitable balance adjustment that doesn't actually want balance adjusted
    if (dto.balanceAdjustment === 0) return "Bad Request";

    try {
      const wallets = JSON.parse(readFileSync('resources/Wallets.json').toString()) as Wallet[];
      const walletIndex = wallets.findIndex(it => it.id === dto.walletId);
      const workingWallet = wallets[walletIndex];
      
      // If we already have that asset in the wallet, update the balance.  If we don't, we'll need to make one.  
      // If the asset doesn't exist and we've received a request to lower the balance, ignore it.  Not dealing with overdrafts here.
      if(workingWallet.assets.some(it => it.id === dto.assetId)) {
        workingWallet.assets = workingWallet.assets.map(it => {
            if (it.id === dto.assetId) {
              it.balance += dto.balanceAdjustment;
            }
          
            return it
          }
        )
      } else if (dto.balanceAdjustment > 0) {
        workingWallet.assets.push({
          id: dto.assetId,
          balance: dto.balanceAdjustment
        })
      }

      // Remove any assets at balance 0
      workingWallet.assets = workingWallet.assets.filter(it => it.balance > 0);
      
      writeFileSync('resources/Wallets.json', JSON.stringify(wallets));

    } catch(e) {
      return "Internal Server Error"
    }
    
    return "Balance updated";
  }
}

export interface AssetSummary {
  id: string;
  name: string;
  symbol: string;
}

export interface AssetDetails extends AssetSummary {
  rank: string;
  supply: string;
  maxSuppply: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
  vwap24Hr: string;
}

interface WalletAsset {
  id: string;
  balance: number;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserReg extends UserLogin {
  name: string;
  email: string;
}

export interface User extends UserReg {
  id: string;
  walletId: string;
}

export interface Wallet {
  id: string;
  userId: string;
  assets: WalletAsset[];
}

export interface BalanceAdjustmentDTO {
  assetId: string;
  balanceAdjustment: number;
  walletId: string;
}

