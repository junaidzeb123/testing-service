import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("test_addDataToFrontUptil")
  async addDataToFrontUptil(@Query() params: any) {
    return await this.appService.addDataToFrontUptil(+params.uptil);
  }



    //test 
  @Get("test_finalTrades")
  async test_finalTrades(@Query() params) {
    const { token_address, trader_address } = params;
    return this.appService.test_finalTrades(trader_address, token_address);
  }

  //
  @Get("test_finalTradesbyno")
  async test_finalTradesbyno(@Query() params) {
    return this.appService.test_finalTradesbyno(+params.no);
  }

}
