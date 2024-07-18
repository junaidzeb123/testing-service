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