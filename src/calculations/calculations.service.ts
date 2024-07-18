import { Injectable } from '@nestjs/common';
import { ELKService } from 'src/globalModules/elk/elk.service';
import { UtilsService } from 'src/globalModules/utils/utils.service';

@Injectable()
export class CalculationsService {

    constructor(private elkService: ELKService, private utilsService: UtilsService) {}

    // test
    // calculates profit given a list of trades
    calculateProfit(trades: any[]) {
        
        const objs = {}
        trades.sort((a, b) => BigInt(a.record_index) <= BigInt(b.record_index)? -1: 1);
        for(let i = 0; i < trades.length; i++) {
            if (i && trades[i].timestamp < trades[i-1].timestamp) {
                throw Error("NOO");
            }
            const trade = trades[i];

            if (objs[trade.trader_address] === undefined) {
                objs[trade.trader_address] = {}
            }
            if (objs[trade.trader_address][trade.token_address] === undefined) {
                objs[trade.trader_address][trade.token_address] = {
                    total_amount_token_buy: 0,
                    total_amount_usd_buy: 0,
                    gain: 0,
                    realized_trades_tokens: 0,
                    realized_trades_dollars: 0
                }
            }
            
            if (trade.side === "buy") {

                objs[trade.trader_address][trade.token_address].total_amount_token_buy += trade.amount_token;
                objs[trade.trader_address][trade.token_address].total_amount_usd_buy += trade.amount_usd;
    
            } else {
    
                const min = (a: number, b: number) => a <= b? a: b;
                const valid_sell = min(objs[trade.trader_address][trade.token_address].total_amount_token_buy, trade.amount_token);
                if (valid_sell === 0) {
                    continue;
                }
                
                // calculate current price by dividing the trade cost in USD by number of tokens
                const curr_price = trade.price_token_usd_tick_1;
    
                // calculate avg price by dividing total 
                const avg_buy_price = objs[trade.trader_address][trade.token_address].total_amount_usd_buy / objs[trade.trader_address][trade.token_address].total_amount_token_buy
                
                objs[trade.trader_address][trade.token_address].gain += (curr_price - avg_buy_price) * valid_sell;
    
                objs[trade.trader_address][trade.token_address].total_amount_usd_buy -= avg_buy_price * valid_sell;
                objs[trade.trader_address][trade.token_address].total_amount_token_buy -= valid_sell;
    
                objs[trade.trader_address][trade.token_address].realized_trades_tokens += valid_sell;
                objs[trade.trader_address][trade.token_address].realized_trades_dollars += avg_buy_price * valid_sell;
            }

        }
    
        return objs;

    }

    // test
    // converts raw trades into the format where each sell holds the profit and
    // other information required to form the final trade to be shown on frontend
    async getProcessedTrade(trades: any[], processedTradesMetadata?: any) {
        trades.sort((a, b) => a.record_index - b.record_index);
        const processedTrades: any[] = [];
        const poolData = {}
        if (processedTradesMetadata === undefined) {
            processedTradesMetadata = {
                total_amount_token_buy: 0,
                total_amount_eth_buy: 0,
                first_buy_block: Number.MAX_SAFE_INTEGER,
                first_buy: 0
            }
        }
        for(let i = 0; i < trades.length; i++) {

            if (poolData[trades[i].pool_address] === undefined) { // TODO: Make this faster by making a central method of retrieving pool data
                // poolData[trades[i].pool_address] = (await this.elkService.getDocById(this.elkService.DexPoolsIndex, trades[i].pool_address))?._source;
            }

            if (trades[i].side === "sell") {
                const trade_amount = this.utilsService.min(trades[i].amount_token, processedTradesMetadata.total_amount_token_buy);
                if (trade_amount === 0) {
                    continue;
                }
                const avg_buy_price_eth = processedTradesMetadata.total_amount_eth_buy / processedTradesMetadata.total_amount_token_buy;
                processedTrades.push({
                    record_index: trades[i].record_index,
                    trader_address: trades[i].trader_address,
                    token_address: trades[i].token_address,
                    pool_address: trades[i].pool_address,
                    trade_timestamp: trades[i].timestamp,
                    block_number: processedTradesMetadata.first_buy_block,
                    avg_buy_price_eth,
                    sell_price_eth: (trades[i].amount_eth - trades[i].transaction_fee_eth) / trades[i].amount_token,
                    trade_amount,
                    first_buy: processedTradesMetadata.first_buy
                })
                processedTradesMetadata.total_amount_token_buy -= trade_amount;
                processedTradesMetadata.total_amount_eth_buy -= trade_amount * avg_buy_price_eth
            } else { // buy
                processedTradesMetadata.total_amount_token_buy += trades[i].amount_token;
                processedTradesMetadata.total_amount_eth_buy += trades[i].amount_eth + trades[i].transaction_fee_eth;
                if (poolData[trades[i].pool_address] !== undefined) { // TODO: remove this check when block number is bulletproof on syve
                    processedTradesMetadata.first_buy_block = this.utilsService.min(processedTradesMetadata.first_buy_block, trades[i].block_number - poolData[trades[i].pool_address].block_number_created);
                }
                processedTradesMetadata.first_buy = processedTradesMetadata.first_buy === 0? trades[i].amount_eth + trades[i].transaction_fee_eth: processedTradesMetadata.first_buy;
            }
        }
        return { processedTradesMetadata, processedTrades };
    }

    // test
    // converts the processed trade list into a single final trade that can be shown on frontend
    async getFinalTrade(p_trades: any[], finalTradeYear?: any) {
        // let ATH_price = undefined;
        p_trades.sort((a, b) => a.record_index - b.record_index);
        if (finalTradeYear === undefined) {
            finalTradeYear = {
                trader_address: "",
                token_address: "",
                trade_date: 0,
                first_buy_block_number: Number.MAX_SAFE_INTEGER,
                first_buy: 0,
                max_ATH_profit: null,
                ATH_xs: null,
                investment: 0,
                net_profit: 0,
                net_xs: 0,
                total_weighted_buy_eth: 0,
                total_amount_buy: 0,
                total_weighted_sell_eth: 0
            }
        }
        for(const trade of p_trades) {
            finalTradeYear.trader_address = trade.trader_address;
            finalTradeYear.token_address = trade.token_address;
            finalTradeYear.first_buy_block_number = this.utilsService.min(finalTradeYear.first_buy_block_number, trade.block_number);
            finalTradeYear.first_buy = finalTradeYear.first_buy === 0? trade.first_buy: finalTradeYear.first_buy;
            finalTradeYear.trade_date = trade.trade_timestamp;
            finalTradeYear.investment += trade.trade_amount * trade.avg_buy_price_eth;
            finalTradeYear.total_weighted_buy_eth += trade.trade_amount * trade.avg_buy_price_eth;
            finalTradeYear.total_amount_buy += trade.trade_amount;
            finalTradeYear.total_weighted_sell_eth += trade.trade_amount * trade.sell_price_eth;

            // Not supported atm
            // if (ATH_price === undefined) {
            //     ATH_price = await this.elkService.getATHPriceByToken(objs.token_address);
            // }

        }
        finalTradeYear.net_profit = finalTradeYear.total_weighted_sell_eth - finalTradeYear.total_weighted_buy_eth;
        finalTradeYear.net_xs = finalTradeYear.total_weighted_sell_eth / finalTradeYear.total_weighted_buy_eth;
        // objs.max_ATH_profit = ATH_price * objs.total_amount_buy - objs.total_weighted_buy_eth;
        // objs.ATH_xs =  ATH_price * objs.total_amount_buy / objs.total_weighted_buy_eth;
        return finalTradeYear;
    }
}
