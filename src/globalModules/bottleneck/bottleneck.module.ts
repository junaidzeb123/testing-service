import { Global, Module } from '@nestjs/common';
import { BottleneckService } from './bottleneck.service';

@Global()
@Module({
    providers: [BottleneckService],
    exports: [BottleneckService]
})
export class BottleneckModule {}
