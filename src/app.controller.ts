import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ----------------
  // init endpoints
  // ----------------

  // Queries all the dex pool data from blockchain and adds to elk
  @Get("init_addDexPoolsData")
  async init_addDexPoolsData() {
    return await this.appService.addDexPoolsData();
  }

  // Queries all the dex trades data from blockchain and adds to elk
  @Get("init_addDexTradesData")
  async addDexTradesData(@Query() params: any) {
    return await this.appService.addDexTradesData(+params.lte_timestamp, +params.gte_timestamp);
  }

  // ----------------
  // update endpoints
  // ----------------

  // --------------
  // test endpoints
  // --------------

  @Get("test_createTimeframeTrades")
  async createTimeframeTrades(@Query() params: any) {
    return this.appService.createTimeframeTrades();
  }

  @Get("test_addDataToFrontUptil")
  async addDataToFrontUptil(@Query() params: any) {
    return await this.appService.addDataToFrontUptil(+params.uptil);
  }


  // TODO: Work in progress
  @Get("test_addDataToFront")
  async addDataToFront(@Query() params: any) {
    return await this.appService.addDataToFront(+params.move_forward_seconds);
  }

  @Get("test_getOHLC")
  async getOHLC() {
    return await this.appService.getOHLC();
  }

  @Get("test_getProcessedTrades")
  async getAllDexPools(@Query() params: any) {
    return await this.appService.getProcessedTrades(params.trader_address, params.token_address);
  }

  @Get("test_calcFinalTrades")
  async calcFinalTrades(@Query() params: any) {
    return await this.appService.calcFinalTrades();
  }


  //test function
  @Get("testfunction")
  async varifyFinalTrades(@Query() params) {
    const { token_address, trader_address } = params;
    return this.appService.varifyFinalTrades(trader_address, token_address);
  }

}
