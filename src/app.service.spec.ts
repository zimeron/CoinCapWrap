import { AppService, AssetDetails } from './app.service';
import { HttpService } from '@nestjs/axios';
import { TestBed } from '@automock/jest';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

describe('AppService', () => {
  let appService: AppService;
  let mockAsset: AssetDetails;
  let httpService: jest.Mocked<HttpService>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(AppService)
        .mock(HttpService)
        .using({ get: jest.fn() })
        .compile();

    appService = unit;

    httpService = unitRef.get(HttpService);
    mockAsset = {
      id:'testId',
      name:'testName',
      symbol:'testSymbol',
      rank: '1',
      supply: '1',
      maxSupply: '1',
      marketCapUsd: '1',
      volumeUsd24Hr: '1',
      priceUsd: '1',
      changePercent24Hr: '1',
      vwap24Hr: '1'
    }
  });

  describe('getAllAssets', () => {
    it('should return a Promise of an array of AssetDetails', async () => {
      const result: AxiosResponse<
        {
          data: AssetDetails[]
        }
      > = {
        // Axios data layer
        data: {
          // CoinCap data layer
          data: [mockAsset]
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: null
        }
      }

      jest.spyOn(httpService, "get").mockImplementationOnce(
        () => of(result)
      );

      const response = await appService.getAllAssets();

      expect(response).toEqual([mockAsset]);
    })
  });

  describe('getAssetById', () => {
    it('should return the Promise of the relevant AssetDetails', async () => {
      const result: AxiosResponse<{
        data: AssetDetails
      }> = {
        data: {
          data: mockAsset
        }, 
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: null
        }
      }

      jest.spyOn(httpService, 'get').mockImplementationOnce(
        () => of(result)
      );

      const response = await appService.getAssetById(mockAsset.id);

      expect(response).toEqual(mockAsset);
    })
  })


});