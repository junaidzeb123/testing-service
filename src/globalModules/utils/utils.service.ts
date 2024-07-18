import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
    min(a: any, b: any) {
        return a < b? a: b;
    }
    max(a: any, b: any) {
        return a > b? a: b;
    }
    objToList(obj: any, keyAttributeName: string) {
        let out: any[] = [];
        Object.keys(obj).forEach(key => {
            out.push({...obj[key], [keyAttributeName]: key});
        });
        return out;
    }
}
