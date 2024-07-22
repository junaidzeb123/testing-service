import { Injectable } from '@nestjs/common';
import { OpensearchClient } from 'nestjs-opensearch';
import { ELK_CONFIG } from 'src/config/config';
import { BottleneckService } from 'src/globalModules/bottleneck/bottleneck.service';

@Injectable()
export class ELKService {

    public DexTradesIndex: string = ELK_CONFIG.INDICES.DEX_TRADES;
    public DexTradesMetadataIndex: string = ELK_CONFIG.INDICES.DEX_TRADES_METADATA;
    public DexPoolsIndex: string = ELK_CONFIG.INDICES.DEX_POOLS;
    public ProcessedTradesIndex: string = ELK_CONFIG.INDICES.PROCESSED_TRADES;
    public ProcessedTradesMetadataIndex: string = ELK_CONFIG.INDICES.PROCESSED_TRADES_METADATA;
    public FinalTradesYearIndex: string = ELK_CONFIG.INDICES.FINAL_TRADES_YEAR;

    constructor(private searchClient: OpensearchClient, private bottleneckService: BottleneckService) { }

    // get a doc by its id or return undefined if it doesn't exist
    async getDocById(index: string, id: string) {
        try {
            return (await this.searchClient.get({
                index,
                id,
            })).body;
        } catch (err) {
            return undefined;
        }
    }

    // creates new docs in bulk by dividing them into chunks
    // assumes that the index, id, isUpdate are inside individual items with attributes of __index, __id, __isUpdate
    async createOrUpdateDocs(items: any[]) {

        const limiter = this.bottleneckService.getLimiter("ELK", { maxConcurrent: 10 * 1024 * 1024, minTime: 0 });

        const safety = 1024 * 1024; // bytes
        const max_chunk_size = 1024 * 1024 * 10 - safety; // bytes
        let gather = "";
        const indices: Set<string> = new Set();
        for (let start = 0; start < items.length; start++) {

            // prep item to add
            const _index = items[start]["__index"];
            const _id = items[start]["__id"];
            const _isUpdate = items[start]["__isUpdate"];
            delete items[start]["__index"];
            delete items[start]["__id"];
            delete items[start]["__isUpdate"];
            let to_add = undefined;
            if (_isUpdate) {
                to_add = JSON.stringify({ update: { _index, _id } })
                    + '\n'
                    + JSON.stringify({ doc: items[start], upsert: items[start] })
                    + '\n'
            } else {
                to_add = JSON.stringify({ create: { _index, _id } })
                    + '\n'
                    + JSON.stringify(items[start])
                    + '\n'
            }

            if (gather.length + to_add.length > max_chunk_size && gather.length > 0) {
                // send add data request
                console.log("Add data request sent for length:", gather.length);
                try {
                    await limiter.schedule({ weight: gather.length + safety }, () => this.searchClient.bulk({ body: gather }));
                    await this.searchClient.indices.refresh({ index: Array.from(indices).join(",") });
                } catch (err) {
                    console.log(err);
                    throw err;
                }
                gather = "";
                indices.clear();
            }
            gather += to_add;
            indices.add(_index);
        }

        if (gather.length > 0) {
            console.log("Add data request sent for length:", gather.length);
            try {
                await limiter.schedule({ weight: gather.length + safety }, () => this.searchClient.bulk({ body: gather }));
                await this.searchClient.indices.refresh({ index: Array.from(indices).join(",") });
            } catch (err) {
                console.log(err);
                throw err;
            }
        }

    }

    // get from an index without any filters
    async getDocs(index: string, size: number) {
        return (await this.searchClient.search({ index, size })).body.hits.hits.map((x: any) => x._source);
    }


    async getDocsByIds(index: string, ids: string[]) {

        const { body } = await this.searchClient.mget({
            index,
            body: { ids }
        });

        return body.docs;

    }



    async retriveTrade(index, trader_address, token_address) {

        const data = await this.searchClient.search({
            index,
            size: 10000,
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { trader_address: trader_address } },
                            { term: { token_address: token_address } }
                        ]
                    }
                }
            }
        });

        const result = data.body.hits.hits.map((trade) => trade._source);
        return result;
    }

    // gettting random docs
    async getRandomDocs(size) {
        const seed = Date.now();
        let result = await this.searchClient.search({
            index: this.DexTradesIndex,
            size: size,
            body: {
                _source: ["token_address", "trader_address"],
                query: {
                    function_score: {
                        query: {
                            match_all: {}
                        },
                        functions: [
                            {
                                random_score: {
                                    field: "token_address",
                                    seed: seed.toString()
                                }
                            }
                        ]
                    }
                }
            }

        })

        return result.body.hits.hits.map((ele) => ele._source);

    }

}
