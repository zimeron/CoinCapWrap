import { AppService, AssetDetails } from './app.service';
import { HttpService } from '@nestjs/axios';
import { TestBed } from '@automock/jest';

describe('AppService', () => {
  let appService: AppService;
  let httpService: jest.Mocked<HttpService>;

  beforeAll(() => {
    const { unit, unitRef } = TestBed.create(AppService)
        .mock(HttpService)
        .using({ get: jest.fn() })
        .compile();

    appService = unit;

    httpService = unitRef.get(HttpService);
  });



});
