import { Injectable } from '@nestjs/common';
import { SyveService } from './syve/syve.service';

@Injectable()
export class BlockchainService {

    constructor(private syveService: SyveService) {}

    // get all dex pools metadata
    async getAllDexPools() {
        return await this.syveService.getAllDexPools();
    }

    // get all dex trades in the given time range
    async getDexTradesByTimerange(gteTimestamp: number, lteTimestamp: number) {
        return await this.syveService.getDexTradesByTimerange(gteTimestamp, lteTimestamp);
    }

    // retrieves and adds all dex trades in a single timerange to elk
    //
    // helpful so you don't have to store all the dex trades before adding to elk
    // you can keep adding the retrieved dex trades as they are received
    async addDexTrades(gteTimestamp: number, lteTimestamp: number) {
        await this.syveService.addDexTradesByTimerangeParallel(gteTimestamp, lteTimestamp);
    }

    // get all time OHLC for the given token list
    async getAllTimeOHLC(tokenList: string[]) {
        return await this.syveService.getAllTimeOHLCParallel(tokenList);
    }
}
