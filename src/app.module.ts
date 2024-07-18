import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ELKModule } from './globalModules/elk/elk.module';
import { CalculationsModule } from './calculations/calculations.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { UtilsModule } from './globalModules/utils/utils.module';
import { BottleneckModule } from './globalModules/bottleneck/bottleneck.module';

@Module({
    imports: [ELKModule, CalculationsModule, BlockchainModule, UtilsModule, BottleneckModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
