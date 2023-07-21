import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppService],
      providers: [AppService],
    }).compile();

    appService = app.get<AppService>(AppService);
  });

  //describe('getAssetById', () => {
    //it('should return the data object for the Bitcoin asset', () => {
      //expect(appController.getHello()).toBe('Hello World!');
    //});
  //});
});
