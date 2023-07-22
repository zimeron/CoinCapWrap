import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  /*  Changes too fast, not sure how to mock that properly
  it('getWalletBalanceSummary', () => {
    return request(app.getHttpServer())
      .get('/wallets/myBalance/3fc1b577-0081-42e1-9a8e-924cdd6801c4')
      .expect(200)
      .expect(
        JSON.stringify({
          "totalUSD": 63747.931825235835,
          "byAsset": [
              {
                "name": "Bitcoin",
                "symbol": "BTC",
                "balance": 2,
                "balanceUSD": 59954.130514994984
              },
              { 
                "name": "Ethereum",
                "symbol": "ETH",
                "balance": 2,
                "balanceUSD": 3793.8013102408518
              }
          ]
        })
      );
  }); */
});
