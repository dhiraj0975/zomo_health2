import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isNil } from 'lodash';

@Injectable()
export class AppCommonConfigProvider {
    constructor(private configService: ConfigService) {}


    private getNumber(key: string): number {
        const value = this.get(key);

        try {
            return Number(value);
        } catch (e) {
            throw new Error(key + ' environment variable is not a number');
        }
    }

    private getString(key: string): string {
        const value = this.get(key);

        return value.replace(/\\n/g, '\n');
    }

    get nodeEnv(): string {
        return this.getString('NODE_ENV');
    }

    private get(key: string): string {
        const value = this.configService.get<string>(key);

        if (isNil(value)) {
            throw new Error(key + ' environment variable does not set'); // probably we should call process.exit() too to avoid locking the service
        }

        return value;
    }
}
