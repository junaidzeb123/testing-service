import * as dotenv from 'dotenv';

const ENV = process.env.NODE_ENV;
dotenv.config({ path: !ENV ? '.env' : `.env.${ENV}` });

const ELK_CONFIG = {
    NODE: process.env.ELK_NODE,
    USERNAME: process.env.ELK_USERNAME,
    PASSWORD: process.env.ELK_PASSWORD,
    INDICES: {
        DEX_TRADES: process.env.ELK_INDEX_DEX_TRADES,
        DEX_TRADES_METADATA: process.env.ELK_INDEX_DEX_TRADES_METADATA,
        DEX_POOLS: process.env.ELK_INDEX_DEX_POOLS,
        PROCESSED_TRADES: process.env.ELK_INDEX_PROCESSED_TRADES,
        PROCESSED_TRADES_METADATA: process.env.ELK_INDEX_PROCESSED_TRADES_METADATA,
        FINAL_TRADES_YEAR: process.env.ELK_INDEX_FINAL_TRADES_YEAR
    }
}

const SYVE_CONFIG = {
    KEY: process.env.SYVE_KEY,
    MAX_CONCURRENT: 5
}

export {
    ELK_CONFIG,
    SYVE_CONFIG
}