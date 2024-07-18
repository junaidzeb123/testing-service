import { Injectable } from '@nestjs/common';
import Bottleneck from "bottleneck";

@Injectable()
export class BottleneckService {

    private limiters: Map<string, Bottleneck> = new Map();

    // Returns a bottleneck limiter that can be used to control concurrency across the service
    //
    // Limiters are differentiated based on the name parameter
    // The options parameter initializes the limiter the first time is receives a certain name to get a limiter
    getLimiter(name: string, options: Bottleneck.ConstructorOptions = { minTime: 1000, maxConcurrent: 3 }): Bottleneck {
        if (!this.limiters.has(name)) {
            this.limiters.set(name, new Bottleneck(options));
        }
        return this.limiters.get(name);
    }
    
}
