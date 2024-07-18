import { Injectable } from '@nestjs/common';
import axios from "axios";
import { BottleneckService } from 'src/globalModules/bottleneck/bottleneck.service';
import { SYVE_CONFIG } from 'src/config/config';
import { ELKService } from 'src/globalModules/elk/elk.service';
import { UtilsService } from 'src/globalModules/utils/utils.service';

@Injectable()
export class SyveService {

    constructor(private utilsService: UtilsService, private elkService: ELKService, private bottleneckService: BottleneckService) {}

    // send a single request with the given parameters to query dex trades from syve
    private async getDexTrades(gteTimestamp: string, lteTimestamp: string, size: string, sort: 'asc'|'desc') {
        const limiter = this.bottleneckService.getLimiter("Syve", { maxConcurrent: SYVE_CONFIG.MAX_CONCURRENT, minTime: 1000 });
        const requestURL = `https://api.syve.ai/v1/filter-api/dex-trades?gte:timestamp=${gteTimestamp}&lte:timestamp=${lteTimestamp}&size=${size}&sort=${sort}&key=${SYVE_CONFIG.KEY}`;
        const response = await limiter.schedule(async ()=>await axios.get(requestURL));
        return response.data;
    }

    // send a single request with the given parameters to query dex pools from syve
    private async getDexPools(from: number, size: number) {
        const limiter = this.bottleneckService.getLimiter("Syve", { maxConcurrent: SYVE_CONFIG.MAX_CONCURRENT });
        const requestURL = `https://api.syve.ai/v1/metadata/dexpools?from=${from}&size=${size}&key=${SYVE_CONFIG.KEY}`;
        const response = await limiter.schedule(async ()=>await axios.get(requestURL));
        return response.data;        
    }

    // send a single request with the given parameters to query all time OHLC from syve
    private async getAllTimeOHLC(tokenList: string[]) {
        const limiter = this.bottleneckService.getLimiter("Syve", { maxConcurrent: SYVE_CONFIG.MAX_CONCURRENT });
        const requestURL = `https://api.syve.ai/v1/price-api/batch-all-time-ohlc`;
        const data = { token_address: tokenList, key: SYVE_CONFIG.KEY }
        const response = await limiter.schedule(async ()=>await axios.post(requestURL, data));
        return response.data;
    }

    // retrieve all the dex pools from syve
    async getAllDexPools() {

        const pools = []
        for(let from = 0; ; from += 10000) {
            const new_pools = await this.getDexPools(from, 10000);
            pools.push(...new_pools);
            if (new_pools.length < 10000) {
                break;
            }
        }
        return pools;
    }

    // get all the all time OHLC from syve by querying parallel
    async getAllTimeOHLCParallel(tokenList: string[], batch_size: number = 10000) {
        let data: any[] = [];
        for (let i = 0; i < tokenList.length; i+=batch_size) {
            let r = this.utilsService.min(tokenList.length, i+batch_size);
            data.push(this.getAllTimeOHLC(tokenList.slice(i, r)));
        }
        data = await Promise.all(data);
        return data.reduce((acc: any[], x)=>acc.concat(...x), []);
    }
    
    // get all the dex trades from syve in a given timerange. it is done in a serial manner
    async getDexTradesByTimerange(gte_timestamp: number, lte_timestamp: number) {
    
        let current_time: number = lte_timestamp;
        let min_time: number = gte_timestamp - 1;
    
        const done = new Set();
        const all_trades: any[] = []
    
        while (current_time >= min_time) {
            const trades: any[] = (await this.getDexTrades(min_time.toString(), current_time.toString(), "100000", "desc"))
            let add_count = 0;
            for (let i = 0; i < trades.length; i++) {
                if (done.has(trades[i].record_index) || trades[i].timestamp < gte_timestamp) {
                    continue;
                }
                all_trades.push(trades[i]);
                done.add(trades[i].record_index);
                add_count++;
            }
            if (add_count == 0) {
                break;
            }
            current_time = this.utilsService.min(current_time - 1, trades[trades.length - 1].timestamp);
        }
        return all_trades;
    }

    // get all the dex trades from syve in a given timerange. it is does in a parallel manner
    //
    // the time range is divided into smaller chunks of size jump and each chunk is processed parallel
    async addDexTradesByTimerangeParallel(gte_timestamp: number, lte_timestamp: number, jump: number = 6 * 60 * 60) {
        let tf = async (start: number, end: number) => {
            console.log(`  >> Start ${start} -> ${end}: ${end - start}`);
            const trades = (await this.getDexTradesByTimerange(start, end)).map(x=>({...x, __index: this.elkService.DexTradesIndex, __id: x.record_index}));
            console.log(`  >> Mid ${start} -> ${end}: ${end - start}`);
            await this.elkService.createOrUpdateDocs(trades);
            console.log(`  >> End ${start} -> ${end}: ${end - start}`);
        }
        const limiter = this.bottleneckService.getLimiter("addDexTrades", { maxConcurrent: SYVE_CONFIG.MAX_CONCURRENT });
        const pms: any[] = []
        for (let start = gte_timestamp; start <= lte_timestamp; start += jump) {
            let end = this.utilsService.min(lte_timestamp, start + jump - 1);
            pms.push(limiter.schedule(()=>tf(start, end)));
        }
        await Promise.all(pms);
    }
}
