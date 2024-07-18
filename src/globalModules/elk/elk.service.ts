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

    async *getAllDocs(index: string, sortBy: string, sortOrder: "asc" | "desc") {
        let response = await this.searchClient.search({
            track_total_hits: true,
            index: index,
            body: {
                sort: [{ [sortBy]: sortOrder }],
                size: 10000
            }
        });

        const totalResultCount = response.body.hits.total.value;
        let yieldCount = 0;
        yieldCount += response.body.hits.hits.length;
        yield response.body.hits.hits.map(x => x._source);
        while (yieldCount < totalResultCount) {
            response = await this.searchClient.search({
                index: this.DexTradesIndex,
                body: {
                    sort: [{ [sortBy]: sortOrder }],
                    size: 10000,
                    search_after: response.body.hits.hits[response.body.hits.hits.length - 1].sort
                }
            });
            yieldCount += response.body.hits.hits.length;
            yield response.body.hits.hits.map(x => x._source);
        }
    }

    // get from an index by a range of a certain field  
    async getDocsByRange(index: string, field: string, gte: number, lte: number, size: number) {
        return (await this.searchClient.search({
            index,
            size,
            body: {
                query: {
                    range: {
                        [field]: {
                            gte,
                            lte
                        }
                    }
                }
            }

        })).body.hits.hits.map((x: any) => x._source);
    }

    // remove from an index by a range of a certain field
    async removeDocsByRange(index: string, field: string, gte: number, lte: number) {
        return (await this.searchClient.deleteByQuery({
            index,
            body: {
                query: {
                    range: {
                        [field]: {
                            gte,
                            lte
                        }
                    }
                }
            }

        })).body;
    }

    // updates a single document of an index using its id value
    async updateDocById(index: string, id: string, body: any) {
        return (await this.searchClient.index({
            index,
            id,
            body,
        })).body;
    }

    // get all dex trades of a single trader and token
    async getDexTradesByTraderAndToken(traderAddress: string, tokenAddress: string) {

        const limiter = this.bottleneckService.getLimiter("ELK", { maxConcurrent: 10 * 1024 * 1024, minTime: 0 });

        let response = await limiter.schedule({ weight: 10 * 1024 * 1024 }, async () => {
            return await this.searchClient.search({
                track_total_hits: true,
                index: this.DexTradesIndex,
                body: {
                    query: {
                        bool: {
                            must: [
                                { term: { trader_address: traderAddress } },
                                { term: { token_address: tokenAddress } },
                            ]
                        }
                    },
                    size: 10000,
                    sort: [{ record_index: "asc" }]
                }
            });
        });
        const totalResultCount = response.body.hits.total.value;
        let allResults = response.body.hits.hits.map(x => x._source);
        while (allResults.length < totalResultCount) {
            response = await limiter.schedule({ weight: 10 * 1024 * 1024 }, async () => {
                return await this.searchClient.search({
                    track_total_hits: true,
                    index: this.DexTradesIndex,
                    body: {
                        query: {
                            bool: {
                                must: [
                                    { term: { trader_address: traderAddress } },
                                    { term: { token_address: tokenAddress } },
                                ]
                            }
                        },
                        size: 10000,
                        sort: [{ record_index: "asc" }],
                        search_after: response.body.hits.hits[response.body.hits.hits.length - 1].sort
                    }
                });
            });
            allResults.push(...(response.body.hits.hits.map(x => x._source)));
        }
        return allResults;

    }

    // TODO: Work in progress
    async getATHPriceByToken(tokenAddress: string) {
        let response = await this.searchClient.search({
            size: 0,
            index: this.DexTradesIndex,
            body: {
                query: {
                    term: {
                        token_address: {
                            value: tokenAddress
                        }
                    }
                },
                aggs: {
                    max_price_eth: {
                        max: {
                            script: {
                                source: "return doc['amount_eth'].value/doc['amount_token'].value"
                            }
                        }
                    }
                }
            }
        });
        return response.body.aggregations.max_price_eth.value;
    }

    async *getAllDexTrades(_source?: string[], searchAfter?: any[]) {

        let response = await this.searchClient.search({
            track_total_hits: true,
            index: this.DexTradesIndex,
            _source,
            body: {
                sort: [{ record_index: "asc" }],
                size: 10000,
                search_after: searchAfter
            }
        });

        const totalResultCount = response.body.hits.total.value;
        let yieldCount = 0;
        yieldCount += response.body.hits.hits.length;
        yield response.body.hits.hits.map(x => x._source);
        while (yieldCount < totalResultCount) {
            response = await this.searchClient.search({
                track_total_hits: true,
                index: this.DexTradesIndex,
                _source,
                body: {
                    sort: [{ record_index: "asc" }],
                    size: 10000,
                    search_after: response.body.hits.hits[response.body.hits.hits.length - 1].sort
                }
            });
            yieldCount += response.body.hits.hits.length;
            yield response.body.hits.hits.map(x => x._source);
        }
    }

    async getAllDexPools(_source: string[]) {

        let response = await this.searchClient.search({
            track_total_hits: true,
            index: this.DexPoolsIndex,
            _source,
            body: {
                sort: [{ pool_address: "asc" }],
                size: 10000
            }
        });

        const totalResultCount = response.body.hits.total.value;
        let allResults = response.body.hits.hits.map(x => x._source);
        while (allResults.length < totalResultCount) {
            response = await this.searchClient.search({
                track_total_hits: true,
                index: this.DexPoolsIndex,
                _source,
                body: {
                    sort: [{ pool_address: "asc" }],
                    size: 10000,
                    search_after: response.body.hits.hits[response.body.hits.hits.length - 1].sort
                }
            });
            console.log("latest: ", response.body.hits.hits[response.body.hits.hits.length - 1]);
            console.log("retrieved: ", allResults.length);
            allResults.push(...(response.body.hits.hits.map(x => x._source)));
        }
        return allResults;
    }

    async getDocsByIds(index: string, ids: string[]) {

        const { body } = await this.searchClient.mget({
            index,
            body: { ids }
        });

        return body.docs;

    }

    // test
    async scrollRetrievel(index, combinations) {
        const fields = ["side", "trader_address", "token_address", "record_index", "timestamp", "amount_usd", "amount_token", "price_token_usd_tick_1"];

        let sm = 0;

        const shouldClauses = combinations.map(combination => ({
            bool: {
                must: [
                    { term: { [combination.field1]: combination.value1 } },
                    { term: { [combination.field2]: combination.value2 } }
                ]
            }
        }));

        const result: any[] = [];
        let response = await this.searchClient.search({
            track_total_hits: true,
            index,
            size: 10000,
            scroll: "30s",
            _source: fields,
            body: {
                query: {
                    bool: {
                        should: shouldClauses
                    }
                }
            }
        });
        sm += response.body.took;
        result.push(...(response.body.hits.hits.map((x: any) => x._source)));

        while (response.body.hits.total.value > result.length) {

            // get the next response if there are more quotes to fetch
            response = await this.searchClient.scroll({
                scroll_id: response.body._scroll_id,
                scroll: '30s'
            });
            sm += response.body.took;
            result.push(...(response.body.hits.hits.map((x: any) => x._source)));
        }

        console.log({
            sm
        })

        return result;
    }

    // test
    async searchAfterRetrievel(index, combinations) {

        const fields = ["side", "trader_address", "token_address", "record_index", "timestamp", "amount_usd", "amount_token", "price_token_usd_tick_1"];

        let sm = 0;

        const shouldClauses = combinations.map(combination => ({
            bool: {
                must: [
                    { term: { [combination.field1]: combination.value1 } },
                    { term: { [combination.field2]: combination.value2 } }
                ]
            }
        }));

        const query = {
            bool: {
                should: shouldClauses
            }
        }

        let allResults = [];
        let hasMoreResults = true;
        let searchAfterValues = [];

        while (hasMoreResults && allResults.length < 1000000) {
            const body = {
                query,
                size: 20000,
                sort: [{ record_index: 'asc' }], // Adjust the sort field and order as needed
                search_after: searchAfterValues,
            };

            if (searchAfterValues.length === 0) {
                delete body.search_after;
            }

            const response = await this.searchClient.search({
                index,
                body,
                _source: fields
            });

            sm += response.body.took;

            const hits = response.body.hits.hits;

            if (hits.length > 0) {
                allResults = allResults.concat(hits);
                searchAfterValues = hits[hits.length - 1].sort;
                console.log(searchAfterValues);
            } else {
                hasMoreResults = false;
            }
        }

        console.log({ sm });
        console.log(allResults.length);
        return allResults.map(x => x._source);
    }

    // test
    async test_function(index, combinations) {
        return await this.searchAfterRetrievel(index, combinations);
    }

    //test

    async retriveTrade(index, trader_address, token_address) {

        const data = await this.searchClient.search({
            index,
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

}
