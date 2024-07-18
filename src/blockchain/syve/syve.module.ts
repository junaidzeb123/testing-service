import { Module } from '@nestjs/common';
import { SyveService } from './syve.service';

@Module({
    exports: [SyveService],
    providers: [SyveService],
    imports: []
})
export class SyveModule {}
