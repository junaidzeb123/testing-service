import { Injectable } from '@nestjs/common';
import { ELKService } from './globalModules/elk/elk.service';
import { CalculationsService } from './calculations/calculations.service';
import { BlockchainService } from './blockchain/blockchain.service';
import { UtilsService } from './globalModules/utils/utils.service';

@Injectable()
export class AppService {

    constructor(private utilsService: UtilsService, private elkService: ELKService,
        private blockchainService: BlockchainService,
        private calculationsService: CalculationsService) { }


    // test
    async addDataToFrontUptil(uptil: number) {
        let { lte_timestamp } = (await this.elkService.getDocs(this.elkService.DexTradesMetadataIndex, 1))[0];
        while (lte_timestamp < uptil) {
            let toAdd = this.utilsService.min(uptil - lte_timestamp, 450);
            if (toAdd <= 0) {
                break;
            }
            lte_timestamp += toAdd;
            console.log("lte_timestamp:", lte_timestamp);
            const moved = await this.addDataToFront(toAdd);
            if (!moved) {
                break;
            }
        }
        console.log(lte_timestamp)
        return "done";
    }

    // TODO: Work in progress
    async addDataToFront(addForwardSeconds: number) {
        // -> retrieve current meta
        // TODO: Error handling

        let lastTime = Date.now();
        let time = Date.now();
        let counter = 0

        const doTime = () => {
            counter++;
            time = Date.now();
            console.log(`${counter}: ${(time - lastTime) / 1000}s`);
            lastTime = time;
        }

        const { lte_timestamp, _ } = (await this.elkService.getDocs(this.elkService.DexTradesMetadataIndex, 1))[0];

        // -> check new time range
        const maxTime = Math.floor(Date.now() / 1000);
        const newLteTimestamp = this.utilsService.min(maxTime, lte_timestamp + addForwardSeconds);
        if (newLteTimestamp <= lte_timestamp) {
            return false
        }
        console.log("newLteTimestamp:", newLteTimestamp);
        // const newGteTimestamp = gte_timestamp + (newLteTimestamp - lte_timestamp);
        // -> retrieve the data to remove. Assuming this data will not go above 10000
        // const data_to_remove = await this.elkService.getDocsByRange(this.elkService.DexTradesIndex, "timestamp", gte_timestamp, new_gte_timestamp - 1, 10000);
        // -> retrieve the data to add

        doTime();

        let dataToAdd = await this.blockchainService.getDexTradesByTimerange(lte_timestamp + 1, newLteTimestamp);
        let new_trades = {};

        doTime();

        // find out unique combinations to update the data for
        // unique comb is having all the unique strings created from trader_address + token_address and new_trades will
        // have all the trades to be added in the structure like 
        // new_trades = {
        //     trader_address + token_address : [] an array of all trades of a unique   trader_address + token_address
        // }

        let unique_combs: any = new Set();
        for (const obj of dataToAdd) {
            const key = `${obj.trader_address}${obj.token_address}`;
            unique_combs.add(key);
            if (new_trades[key] === undefined) {
                new_trades[key] = [obj]
            } else {
                new_trades[key].push(obj)
            }
        }

        console.log("unique combs: ", Array.from(unique_combs).length);

        doTime();

        // as we have created the ids of new trades to be inserted by  trader_address + token_address in unique_combs
        // so if any documents already exits in ProcessedTradesMetadataIndex having the  same   trader_address and 
        // token_address  will be returned here to add more data from new trades of same rader_address and 
        // token_address
        let existingProcessedMetadata: any = await this.elkService.getDocsByIds(this.elkService.ProcessedTradesMetadataIndex, Array.from(unique_combs));

        doTime();


        // same thing as above for  ProcessedTradesMetadataIndex. here it is for FinalTradesYearIndex
        let existingFinalTradesYear: any = await this.elkService.getDocsByIds(this.elkService.FinalTradesYearIndex, Array.from(unique_combs));

        doTime();

        // functions taking the list of documents and returning an object having structure like this 
        // { id : { document._source }} 
        const conv = (li: any[]) => {
            const out = {};
            for (const ele of li) {
                out[ele._id] = ele._source;
            }
            return out;
        }

        // return existingProcessedMetadata;
        existingProcessedMetadata = conv(existingProcessedMetadata);

        doTime();

        existingFinalTradesYear = conv(existingFinalTradesYear);

        let allProcessedTrades = [];

        doTime();


        // as we have a set having strings of all unqiue trader_address + token_address  and an obj
        // new_trades having all the new trades coming from syve in the structure of  
        // new_trades = {
        //     trader_address + token_address : [] an array of all trades of a unique   trader_address + token_address
        // }
        // so here we all iterating through each of  the new_trades element so get procssedTrade and finalyeartrade of 
        // a unqiue combination of trader_address + token_address and storing in allProcessedTrades

        for (const unique_comb of unique_combs) {
            // console.log("doing", unique_comb)
            const { processedTradesMetadata, processedTrades } = await this.calculationsService.getProcessedTrade(new_trades[unique_comb], existingProcessedMetadata[unique_comb]);

            existingFinalTradesYear[unique_comb] = await this.calculationsService.getFinalTrade(processedTrades, existingFinalTradesYear[unique_comb]);

            existingProcessedMetadata[unique_comb] = processedTradesMetadata;
            allProcessedTrades.push(...processedTrades);
        }

        doTime();

        /**
         * objToList do some like this
         * const inputObj = 
        *       {                                               [
                    a: { prop1: 'value1' },                       { "prop1": "value1", "id": "a" },
                    b: { prop1: 'value2' },   -------------->    { "prop1": "value2", "id": "b" },
                    c: { prop1: 'value3' }                       { "prop1": "value3", "id": "c" }
                };                                               ]

                the after passing from map the  finally existingFinalTradesYear will look like 
                [
                     { "prop1": "value1", "id": "a" , __index : finalTradeYearIndex, __isUpdate : true },
                     { "prop1": "value1", "id": "b" , __index : finalTradeYearIndex, __isUpdate : true },
                     { "prop1": "value1", "id": "c" , __index : finalTradeYearIndex, __isUpdate : true },
               ]

               same for existingProcessedMetadata
         */

        existingFinalTradesYear = this.utilsService.objToList(existingFinalTradesYear, "__id")
            .map(x => ({ ...x, __index: this.elkService.FinalTradesYearIndex, __isUpdate: true }));

        doTime();

        existingProcessedMetadata = this.utilsService.objToList(existingProcessedMetadata, "__id")
            .map(x => ({ ...x, __index: this.elkService.ProcessedTradesMetadataIndex, __isUpdate: true }));

        doTime();

        allProcessedTrades = allProcessedTrades.map(x => ({ ...x, __index: this.elkService.ProcessedTradesIndex, __id: x.record_index }));

        doTime();

        dataToAdd = dataToAdd.map(x => ({ ...x, __index: this.elkService.DexTradesIndex, __id: x.record_index }));

        doTime();

        // -> remove the data
        // const remove_docs_response = await this.elkService.removeDocsByRange(this.elkService.DexTradesIndex, "timestamp", gte_timestamp, newGteTimestamp - 1);

        // -> update meta
        const old_meta = (await this.elkService.getDocById(this.elkService.DexTradesMetadataIndex, "main"))._source;
        const new_meta = [{
            ...old_meta,
            lte_timestamp: newLteTimestamp,
            __id: "main",
            __index: this.elkService.DexTradesMetadataIndex,
            __isUpdate: true
        }];

        // write data
        await this.elkService.createOrUpdateDocs(
            dataToAdd
                .concat(allProcessedTrades)
                .concat(existingProcessedMetadata)
                .concat(existingFinalTradesYear)
                .concat(new_meta)
        );

        doTime();

        return true;

    }



    //test
    async test_finalTrades(trader_address, token_address): Promise<{ result, ans }> {

        const trades = await this.elkService.retriveTrade(this.elkService.DexTradesIndex, trader_address, token_address);

        const ElkfinalYearTrades = await this.elkService.getDocsByIds(this.elkService.FinalTradesYearIndex, [trader_address + token_address]);
        //  await this.elkService.retriveTrade(this.elkService.FinalTradesYearIndex, trader_address, token_address);

        const ElkprocessedTrades = await this.elkService.retriveTrade(this.elkService.ProcessedTradesIndex, trader_address, token_address);

        let { processedTrades, processedTradesMetadata } = await this.calculationsService.getProcessedTrade(trades);
        let finalTrade: any = await this.calculationsService.getFinalTrade(processedTrades);

        let ans: Boolean = true;

        let response: string = ""
        if ((JSON.stringify(ElkfinalYearTrades[0]._source) === JSON.stringify(finalTrade)) === false) {
            console.log("final trades are differnt");
            ans = false;
        }

        // if ((JSON.stringify(ElkprocessedTrades) === JSON.stringify(processedTrades)) === false) {
        //     ans = false;
        //     console.log("processed trades are differnt");

        // }
        // console.log("ElkprocessedTrades:\n", ElkprocessedTrades);
        // console.log("processedTradesCalcuated:\n", processedTrades);

        // console.log("ElkfinalYearTrades:\n", ElkfinalYearTrades[0]._source);
        // console.log("finalYearCalcuated:\n", finalTrade);
        let result = {
            "ElkfinalYearTrades": ElkfinalYearTrades[0]._source,
            "CalcuatedfinalYear": finalTrade,
            ElkprocessedTrades,
            processedTrades
        }

        return { result, ans };
    }


    async test_finalTradesbyno(no: Number) {
        const data = await this.elkService.getRandomDocs(no);
        console.log(data);

        let ans = true;
        for (const iterator of data) {
            const result = await this.test_finalTrades(iterator.trader_address, iterator.token_address);
            if (result.ans == false) {
                console.log("Differnt Result from elk and calcuation");
                console.log("trader_address: ", iterator.trader_address);
                console.log("token_address: ", iterator.token_address);

                console.log(result.result);
                ans = false;
                // break;
            }
        }
        return ans;
    }
}
