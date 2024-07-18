import { Global, Module } from '@nestjs/common';
import { OpensearchModule } from 'nestjs-opensearch';
import { ELK_CONFIG } from 'src/config/config';
import { ELKService } from './elk.service';

@Global()
@Module({
    imports: [
        OpensearchModule.forRoot({
            node: ELK_CONFIG.NODE,
            auth: { username: ELK_CONFIG.USERNAME, password: ELK_CONFIG.PASSWORD }
        })
    ],
    providers: [ELKService],
    exports: [ELKService]
})
export class ELKModule {}