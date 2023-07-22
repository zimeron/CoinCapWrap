import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { readFile, readFileSync, writeFile, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { compareSync, hash, hashSync } from 'bcrypt';

@Injectable()
export class AppService {
  private coinCapUrl: string = "https://api.coincap.io/v2";

  constructor(private httpService: HttpService) {
  }

  // Annoyingly, CoinCap structure their returns as an object with a data block, much like how axios structures their returns as an object with a data block
  // So you have to drill a bit for the actual data you want
  async getAllAssets(): Promise<AssetDetails[]> {
    const { data } = await firstValueFrom(this.httpService.get<{data: AssetDetails[]}>(
        this.coinCapUrl + "/assets"
      ).pipe(catchError((error: AxiosError) => {
        console.log("An error occurred: " + error.response.data);
        throw 'Internal Server Error';
      })
    ));
    
    return data.data;
  }

  async getAssetById(id: string): Promise<AssetDetails> {
    const { data } = await firstValueFrom(this.httpService.get<{
      data: AssetDetails
    }>(this.coinCapUrl + "/assets/" + id)
    .pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw 'Internal Server Error';
      })
    ));

    return data.data;
  }

  public async registerUser(userReg: UserReg): Promise<string> {
    const userId = uuidv4();

    const user: User = {
      ...userReg,
      id: userId,
      walletId: await this.createWallet(userId),
      password: hashSync(userReg.password, 10)
    }

    try {
      let users = JSON.parse(readFileSync('resources/RegUsers.json').toString()) as User[];
      if(!users.some(it => it.username === user.username)) {
        users.push(user);
        writeFileSync('resources/RegUsers.json', JSON.stringify(users));
        console.log('User successfully registered');
      } else throw("Username already exists");

      return "Registration successful";
    } catch {
      return "Internal Server Error";
    }
  }

  public loginUser(userLogin: UserLogin): string {

    try {
      const users = JSON.parse(readFileSync('resources/RegUsers.json').toString()) as User[];
      const user = users.find(it => it.username = userLogin.username);
  
      const tokens = JSON.parse(readFileSync('resources/UserTokens.json').toString()) as [{ user: string, token: string }];

      if (tokens.some(it => it.user === user.username)) {
        return "Error: user already logged in";
      }

      const token = uuidv4();
      tokens.push({
        user: user.username,
        token: token
      });
      writeFileSync('resources/UserTokens.json', JSON.stringify(tokens));

      return compareSync(userLogin.password, user.password) ? "Login successful, here is your token: " + token.toString() : "Invalid login credentials";
    } catch {
      return "Internal Server Error";
    }
  }

  public logoutUser(userName: string): string {
    try {
      const tokens = JSON.parse(readFileSync('resources/UserTokens.json').toString()) as [{user: string, token: string}];

      if(!tokens.some(it => it.user === userName)) {
        return "Error: user is not logged in";
      }

      tokens.splice(tokens.findIndex(it => it.user === userName), 1);
      writeFileSync('resources/UserTokens.json', JSON.stringify(tokens));
      return "Logged out successfully";
    } catch {
      return "Internal server error";
    }
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

    } catch {
      return "Internal Server Error"
    }
    
    return "Balance updated";
  }

  public async getWalletBalanceSummary(id: string): Promise<WalletBalanceSummary> {
    const wallets = JSON.parse(readFileSync('resources/Wallets.json').toString()) as Wallet[];
    const selectedAssets = wallets.find(it => it.id === id).assets;

    // If they're broke, we won't bother with CoinCap
    if(selectedAssets.length === 0) {
      return {
        totalUSD: 0,
        byAsset: []
      }
    }

    const detailedAssets = await this.getAllAssets();
    

    // Grab the details for the relevant assets
    const byAsset = selectedAssets.map(asset => {
      const detailedAsset = detailedAssets.find(details => details.id === asset.id);
      return {
        name: detailedAsset.name,
        symbol: detailedAsset.symbol,
        balance: asset.balance,
        balanceUSD: asset.balance * +detailedAsset.priceUsd
      }
    });

    // Total USD is a summation of the balanceUSD of all the assets together
    return {
      totalUSD: byAsset.map(asset => asset.balanceUSD).reduce((a, b) => {
        return a + b;
      }),
      byAsset: byAsset
    }  
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
  maxSupply: string;
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

interface ReportWalletAsset {
  name: string;
  symbol: string;
  balance: number;
  balanceUSD: number;
}

export interface WalletBalanceSummary {
  totalUSD: number;
  byAsset: ReportWalletAsset[]
}

