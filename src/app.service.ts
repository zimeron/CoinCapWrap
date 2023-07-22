import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, last } from 'rxjs';
import { readFileSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { compareSync, hashSync } from 'bcrypt';

@Injectable()
export class AppService {
  private coinCapUrl: string = "https://api.coincap.io/v2";

  constructor(private httpService: HttpService) {
  }

  // Annoyingly, CoinCap structure their returns as an object with a data block, much like how axios structures their returns as an object with a data block
  // So you have to drill a bit for the actual data you want
  public async getAllAssets(): Promise<AssetDetails[]> {
    const { data } = await firstValueFrom(this.httpService.get<{ data: AssetDetails[] }>(this.coinCapUrl + "/assets").pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error.response.data);
        throw 'Internal Server Error';
      })
    ));
    
    return data.data;
  }

  public async getAssetById(id: string): Promise<AssetDetails> {
    const { data } = await firstValueFrom(this.httpService.get<{ data: AssetDetails }>(this.coinCapUrl + "/assets/" + id).pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw 'Internal Server Error';
      })
    ));

    return data.data;
  }

  private async getAssetHistoryById(id: string, interval: string): Promise<AssetHistory[]> {
    const { data } = await firstValueFrom(this.httpService.get<{ data: AssetHistory[] }>(this.coinCapUrl+ "/assets/" + id + "/history?interval=" + interval).pipe(
      catchError((error: AxiosError) => {
        console.log("An error occurred: " + error);
        throw 'Internal Server Error';
        })
      ));
    
    return data.data;
  }

  public async convertAssetToUSD(assetId: string, assetQuantity: number): Promise<string> {
    const assetPrice = (await this.getAssetById(assetId)).priceUsd;

    return "Value in USD: " + (+assetPrice * assetQuantity).toString(); 
  }

  public async convertUSDToAsset(assetId: string, usdQuantity: number): Promise<string> {
    const assetPrice = (await this.getAssetById(assetId)).priceUsd;

    return "Can purchase: " + ((1/+assetPrice) * usdQuantity).toString() + " of asset with id \"" + assetId + "\"";

  }

  public registerUser(userReg: UserReg): string {
    try {
      const userId = uuidv4();
      const walletId = this.createWallet(userId);

      if(walletId === "Internal Server Error") {
        throw "Wallet creation failed"
      }

      const user: User = {
        ...userReg,
        id: userId,
        walletId: walletId,
        password: hashSync(userReg.password, 10)
      }

      let users = JSON.parse(readFileSync('resources/RegUsers.json').toString()) as User[];
      if(!users.some(it => it.username === user.username)) {
        users.push(user);
        writeFileSync('resources/RegUsers.json', JSON.stringify(users));
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
      return "Internal Server Error";
    }
  }
  
  // Used to generate a wallet automatically for a new user when they register
  private createWallet(userId: string): string {
    try {
      const walletId = uuidv4();
      const wallet: Wallet = {
        id: walletId,
        userId: userId,
        assets: [],
        transactions: [],
        timeCreated: Date.now()
      }

      let wallets = JSON.parse(readFileSync('resources/Wallets.json').toString()) as Wallet[];
      wallets.push(wallet);
      writeFileSync('resources/Wallets.json', JSON.stringify(wallets));
      return wallet.id;
    } catch {
      return "Internal Server Error"
    }
  }

  // Updates balance of a given asset in a given wallet.  Assumes that requests to lower asset balance come from a frontend as negative numbers in balanceAdjustment.
  public updateBalance(dto: BalanceAdjustment): string {
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

      // Record the transaction so history is maintained.
      workingWallet.transactions.push({
        balanceChange: dto.balanceAdjustment,
        assetId: dto.assetId,
        timestamp: Date.now()
      })

      // Remove any assets at balance 0
      workingWallet.assets = workingWallet.assets.filter(it => it.balance > 0);
      
      writeFileSync('resources/Wallets.json', JSON.stringify(wallets));

    } catch {
      return "Internal Server Error"
    }
    
    return "Balance updated";
  }

  public async getWalletBalanceSummary(id: string): Promise<WalletBalanceSummary | string> {
    try {
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
  
      // Grab the price for the relevant assets
      const byAsset = selectedAssets.map(asset => {
        const usdPrice = detailedAssets.find(it => it.id === asset.id).priceUsd;
        return {
          id: asset.id,
          balance: asset.balance,
          balanceUSD: asset.balance * +usdPrice
        }
      });
  
      // Total USD balance of the wallet is a summation of the balanceUSD of all the assets together
      return {
        totalUSD: byAsset.map( asset => asset.balanceUSD).reduce((a, b) => {
          return a + b;
        }),
        byAsset: byAsset
      };  
    } catch {
      return "Internal Server Error";
    };
  }

  public async getWalletBalanceHistory(id: string): Promise<WalletBalanceHistorySummary[] | string> {
    try {
      const wallets = JSON.parse(readFileSync('resources/Wallets.json').toString()) as Wallet[];
      const workingWallet = wallets.find(it => it.id === id);

      // Figure out all the assets which have ever been in this wallet based on transaction history
      let relevantAssetIds: string[] = [];
      relevantAssetIds = workingWallet.transactions.map(transaction => {
        if (!relevantAssetIds.includes(transaction.assetId)) {
          return transaction.assetId;
        }
      });

      // Get a day-by-day price history of the relevant assets, during the period in which the wallet has existed.
      // I would be doing this with the "start" and "end" params to pull less into memory, but CoinCap won't let you use those without paying
      const assetHistories = await Promise.all(relevantAssetIds.map(async assetId => {
          return {
            assetId: assetId,
            priceData: (await this.getAssetHistoryById(assetId, "d1")).filter(history => history.time >= workingWallet.timeCreated)
          }
        }
      ));
      
      // Get all the unique dates we've been given in the asset history lookups
      const dates = assetHistories.flatMap(historyWithAsset => {
        return [...new Set(historyWithAsset.priceData.map(it => it.date))];
      });

      // Normalize all the asset prices to date rather than to asset.  In other words, switch the data around so we have all the assets and their prices on a given date,
      // instead of all date/price combinations on a given asset.
      const normalizedHistories: {
        date: string,
        time: number,
        assetPrices: {
          assetId: string,
          priceUsd: string
        }[]
      }[] = dates.map(date => {
        return {
          date: date,
          time: new Date(date).getTime(),
          assetPrices: assetHistories.map(historyWithAsset => {
            const pricesAtDate = historyWithAsset.priceData.find(history => history.date === date);
            return {
              assetId: historyWithAsset.assetId,
              priceUsd: pricesAtDate.priceUsd
            }
          })
        };
      });

      // For each date in the normalized histories, reconstruct the wallet based on the transaction log up to that point
      let index = 0;
      let historicalBalances: WalletBalanceHistorySummary[] = [];
      normalizedHistories.map(history => {

        // Grab the transactions prior to the date we've pulled
        const relevantTransactions = workingWallet.transactions.filter(transaction => transaction.timestamp <= history.time);

        // Wallet we're reconstructing for this date
        let reconWallet: Wallet = {
          id: workingWallet.id,
          userId: workingWallet.userId,
          assets: [],
          transactions: [],
          timeCreated: history.time
        }

        // Apply transactions in order to the wallet
        relevantTransactions.map(transaction => {
          if(reconWallet.assets.some(asset => asset.id === transaction.assetId)) {
            reconWallet.assets.find(asset => asset.id === transaction.assetId).balance += transaction.balanceChange;
          } else {
            reconWallet.assets.push({
              id: transaction.assetId,
              balance: transaction.balanceChange
            });
          }
        });

        const lastIterationTotal = index === 0 ? 0 : historicalBalances[index - 1].totalUSD 
        index++;

        // Calculate balance in USD based on the history information we have for the assets on this date
        if(reconWallet.assets.length > 0 ) {
          const byAsset = reconWallet.assets.map(asset => {
            const usdPrice = history.assetPrices.find(it => it.assetId === asset.id).priceUsd;
            return {
              id: asset.id,
              balance: asset.balance,
              balanceUSD: asset.balance * +usdPrice
            }
          });

          const totalUSD = byAsset.map(asset => asset.balanceUSD).reduce((a, b) => {
            return a + b;
          });
     
          historicalBalances.push({
            totalUSD: totalUSD,
            byAsset: byAsset,
            timestamp: history.time,
            netChangeNominal: totalUSD - lastIterationTotal,
            netChangeRate: lastIterationTotal === 0 ? (totalUSD/1 * 100).toString() + "%": ((totalUSD - lastIterationTotal)/lastIterationTotal * 100).toString() + "%"
          });
        } else {
          historicalBalances.push({
            totalUSD: 0,
            byAsset: [],
            timestamp: history.time,
            netChangeNominal: 0 - lastIterationTotal,
            netChangeRate: lastIterationTotal === 0 ? "0%": ((0 - lastIterationTotal)/lastIterationTotal * 100).toString() + "%"
          })
        }
      });

      return historicalBalances;

    } catch(e) {
      console.log(e);
      return "Internal Server Error";
    };
  }
}

// Short list of identifiers for an asset
export interface AssetSummary {
  id: string;
  name: string;
  symbol: string;
}

// Full details for an asset
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

// Asset as it matters to a wallet
interface WalletAsset {
  id: string;
  balance: number;
}

// User creds for logins
export interface UserLogin {
  username: string;
  password: string;
}

// Registration information
export interface UserReg extends UserLogin {
  name: string;
  email: string;
}

// Internal User information they themselves don't need to know about
export interface User extends UserReg {
  id: string;
  walletId: string;
}

// Holds assets, belongs to a user, and stores its own history
export interface Wallet {
  id: string;
  userId: string;
  assets: WalletAsset[];
  transactions: WalletTransaction[];
  timeCreated: number;
}

// What we expect form a request to change an asset's balance in a wallet
export interface BalanceAdjustment {
  assetId: string;
  balanceAdjustment: number;
  walletId: string;
}

// An asset as it matters to reporting on wallet value
interface ReportWalletAsset {
  id: string;
  balance: number;
  balanceUSD: number;
}

// Formatted summary of wallet value, both in total and per-asset
export interface WalletBalanceSummary {
  totalUSD: number;
  byAsset: ReportWalletAsset[]
}

// Like a balance summary, but not current so it includes a time it's referring to, 
// and some change over time statistics useful to someone checking how their investments are doing
export interface WalletBalanceHistorySummary extends WalletBalanceSummary {
  timestamp: number;
  netChangeNominal: number;
  netChangeRate: string;
}

// Stores history of successful balance updates on a wallet for history calculations
interface WalletTransaction {
  balanceChange: number;
  assetId: string;
  timestamp: number;
}

// Clones the actual data fields of the CoinCap history asset history object
interface AssetHistory {
  priceUsd: string,
  time: number,
  date: string
}

export interface usdConversionRequest {
  assetId: string;
  assetQuantity: number;
}

export interface asssetConversionRequest {
  assetId: string;
  usdQuantity: number;
}