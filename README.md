# Wallet Finder Blockchain

## Notes
- Endpoints starting with "init_" are used for first time data retrievel. They are resource heavy and should not be used frequently.
- Endpoints starting with "update_" are used for updating data after first retrievel. They should be used to keep data up to date.
- Endpoints starting with "test_" are built for dev testing and should not be used in production.

## ELK Structure
### Indices

1) DexTradesMetadata:

    Holds the metadata for DexTrades index. Has the following mapping.

    ```js
    {
      "lte_timestamp": {
        "type": "long"
      },
      "gte_timestamp": {
        "type": "long"
      },
      "processsed_till": {
        "type": "long"
      }
    }
    ```

2) DexTrades:
 
    Holds the raw trades received from Syve. Has the following mapping.
    
    ```js
    {
      "_price_eth_usd": {
          "type": "double"
      },
      "_ratio": {
          "type": "double"
      },
      "amount_eth": {
          "type": "double"
      },
      "amount_token": {
          "type": "double"
      },
      "amount_usd": {
          "type": "double"
      },
      "block_number": {
          "type": "long"
      },
      "gas_price_eth": {
          "type": "double"
      },
      "gas_price_usd": {
          "type": "double"
      },
      "gas_used": {
          "type": "long"
      },
      "interacted_with_address": {
          "type": "keyword"
      },
      "num_trades_1h": {
          "type": "long"
      },
      "num_trades_24h": {
          "type": "long"
      },
      "pool_address": {
          "type": "keyword"
      },
      "price_token_usd_robust_tick_1": {
          "type": "double"
      },
      "price_token_usd_tick_1": {
          "type": "double"
      },
      "protocol_name": {
          "type": "keyword"
      },
      "record_index": {
          "type": "long"
      },
      "side": {
          "type": "keyword"
      },
      "timestamp": {
          "type": "long"
      },
      "token_address": {
          "type": "keyword"
      },
      "token_name": {
          "type": "keyword"
      },
      "token_symbol": {
          "type": "keyword"
      },
      "trader_address": {
          "type": "keyword"
      },
      "transaction_fee_eth": {
          "type": "double"
      },
      "transaction_fee_usd": {
          "type": "double"
      },
      "transaction_hash": {
          "type": "keyword"
      },
      "volume_1h_usd": {
          "type": "double"
      },
      "volume_24h_usd": {
          "type": "double"
      }
    }
    ```
3) DexPools:

    Holds the raw pool data received from Syve. Has the following mapping.
    
    ```js
    {
      "protocol": {
        "type": "keyword"
      },
      "timestamp_created": {
        "type": "long"
      },
      "block_number_created": {
        "type": "long"
      },
      "pool_address": {
        "type": "keyword"
      },
      "token_0_address": {
        "type": "keyword"
      },
      "token_1_address": {
        "type": "keyword"
      }
    }
    ```

4) ProcessedTrades:

    Holds the processed trades (only sells with profit included). Has the following mapping.
    
    ```js
    {
      "record_index": {
        "type": "long"
      },
      "trader_address": {
        "type": "keyword"
      },
      "token_address": {
        "type": "keyword"
      },
      "pool_address": {
        "type": "keyword"
      },
      "trade_timestamp": {
        "type": "long"
      },
      "block_number": {
        "type": "long"
      },
      "avg_buy_price_eth": {
        "type": "double"
      },
      "sell_price_eth": {
        "type": "double"
      },
      "trade_amount": {
        "type": "double"
      },
      "first_buy": {
        "type": "double"
      }
    }
    ```

5) ProcessedTradesMetadata:

    Holds the processed trades (only sells with profit included). Has the following mapping.
    
    ```js
    {
      "trader_address": {
        "type": "keyword"
      },
      "token_address": {
        "type": "keyword"
      },
      "total_amount_token_buy": {
          "type": "double"
      },
      "total_amount_eth_buy": {
          "type": "double"
      },
      "first_buy_block": {
          "type": "long"
      },
      "first_buy": {
          "type": "double"
      }
    }
    ```

6) FinalTradesYear:

    Holds the final per trader per token trades for year timeframe. Has the following mapping.
   
    ```js
    {
      "trader_address": {
        "type": "keyword"
      },
      "token_address": {
        "type": "keyword"
      },
      "trade_date": {
        "type": "long"
      },
      "first_buy_block_number": {
        "type": "long"
      },
      "first_buy": {
        "type": "double"
      },
      "max_ATH_profit": {
        "type": "double"
      },
      "ATH_xs": {
        "type": "double"
      },
      "investment": {
        "type": "double"
      },
      "net_profit": {
        "type": "double"
      },
      "net_xs": {
        "type": "double"
      },
      "total_weighted_buy_eth": {
        "type": "double"
      },
      "total_amount_buy": {
        "type": "double"
      },
      "total_weighted_sell_eth": {
        "type": "double"
      }
    }
    ```

## TODO
- Add logging
- Add input parameter validation
- Add another source to get dex pool info
- create single index for different timeframes of final trades?
- is update slower than insertion?


DIFFERENT RESULTS FOR 

{
  "result": {
    "ElkfinalYearTrades": {
      "trader_address": "0xae2fc483527b8ef99eb5d9b44875f005ba1fae13",
      "token_address": "0xf0069822c44982d5d9b6d272b5b9636c48487690",
      "trade_date": 1689079979,
      "first_buy_block_number": 9007199254740991,
      "first_buy": 0.10744279101962183,
      "max_ATH_profit": null,
      "ATH_xs": null,
      "investment": 4.861429296752331,
      "net_profit": -0.019270347157529955,
      "net_xs": 0.9960360737591302,
      "total_weighted_buy_eth": 4.861429296752331,
      "total_amount_buy": 1080616205.1,
      "total_weighted_sell_eth": 4.842158949594801
    },
    "CalcuatedfinalYear": {
      "trader_address": "0xae2fc483527b8ef99eb5d9b44875f005ba1fae13",
      "token_address": "0xf0069822c44982d5d9b6d272b5b9636c48487690",
      "trade_date": 1689079871,
      "first_buy_block_number": 9007199254740991,
      "first_buy": 0.13885128448235054,
      "max_ATH_profit": null,
      "ATH_xs": null,
      "investment": 1.0849525030897216,
      "net_profit": -0.01454688889531508,
      "net_xs": 0.9865921421869727,
      "total_weighted_buy_eth": 1.0849525030897216,
      "total_amount_buy": 436400849.09999996,
      "total_weighted_sell_eth": 1.0704056141944065
    }
  },
  "ans": false
}



{
  "result": {
    "ElkfinalYearTrades": {
      "trader_address": "0xc26138859a31a06b07e45b69378dfd89a1060b2f",
      "token_address": "0xab306326bc72c2335bd08f42cbec383691ef8446",
      "trade_date": 1689040931,
      "first_buy_block_number": 9007199254740991,
      "first_buy": 0.22491631328897785,
      "max_ATH_profit": null,
      "ATH_xs": null,
      "investment": 1.7331774350333782,
      "net_profit": -0.21332210065934154,
      "net_xs": 0.8769184871973403,
      "total_weighted_buy_eth": 1.7331774350333782,
      "total_amount_buy": 4872915708.814346,
      "total_weighted_sell_eth": 1.5198553343740366
    },
    "CalcuatedfinalYear": {
      "trader_address": "0xc26138859a31a06b07e45b69378dfd89a1060b2f",
      "token_address": "0xab306326bc72c2335bd08f42cbec383691ef8446",
      "trade_date": 1689039383,
      "first_buy_block_number": 9007199254740991,
      "first_buy": 0.22491631328897785,
      "max_ATH_profit": null,
      "ATH_xs": null,
      "investment": 1.2874183306117402,
      "net_profit": -0.14758571422907907,
      "net_xs": 0.8853630473329124,
      "total_weighted_buy_eth": 1.2874183306117402,
      "total_amount_buy": 3637252189.8797626,
      "total_weighted_sell_eth": 1.139832616382661
    }
  },
  "ans": false
}


Differnt Result from elk and calcuation
trader_address:  0xae2fc483527b8ef99eb5d9b44875f005ba1fae13
token_address:  0xf21661d0d1d76d3ecb8e1b9f1c923dbfffae4097
{
   ElkfinalYearTrades: {
    trader_address: '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
    token_address: '0xf21661d0d1d76d3ecb8e1b9f1c923dbfffae4097',
    trade_date: 1689078539,
    first_buy_block_number: 9007199254740991,
    first_buy: 1.1149695428709523,
    max_ATH_profit: null,
    ATH_xs: null,
    investment: 16.13434749241136,
    net_profit: -0.7358829435064393,
    net_xs: 0.9543902879337045,
    total_weighted_buy_eth: 16.13434749241136,
    total_amount_buy: 136889.81906580017,
    total_weighted_sell_eth: 15.398464548904922
  },
  CalcuatedfinalYear: {
    trader_address: '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
    token_address: '0xf21661d0d1d76d3ecb8e1b9f1c923dbfffae4097',
    trade_date: 1689023171,
    first_buy_block_number: 9007199254740991,
    first_buy: 1.1149695428709523,
    max_ATH_profit: null,
    ATH_xs: null,
    investment: 2.3258231210562466,
    net_profit: -0.30768669181081254,
    net_xs: 0.8677084731744003,
    total_weighted_buy_eth: 2.3258231210562466,
    total_amount_buy: 18573.88831850238,
    total_weighted_sell_eth: 2.018136429245434
  }
}



uptill : 1689081772