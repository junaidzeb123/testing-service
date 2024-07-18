import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { SyveModule } from './syve/syve.module';

@Module({
    providers: [BlockchainService],
    imports: [SyveModule],
    exports: [BlockchainService]
})
export class BlockchainModule {}
