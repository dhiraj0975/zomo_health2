import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { isNil } from 'lodash';

@Injectable()
export class AppTimezoneConfigProvider {
    constructor(private configService: ConfigService) {}

    private getTypeOrmConfig(suffix: string | number): TypeOrmModuleOptions {
        return {
            type: 'mysql',
            host: this.getString(`DB_HOST_PROD_${suffix}`),
            port: this.getNumber(`DB_PORT_PROD`),
            username: this.getString(`DB_USERNAME_PROD`),
            password: this.getString(`DB_PASSWORD_PROD`),
            database: this.getString(`DB_DATABASE_PROD`),
            synchronize: false,
            logging: false,
            logger: 'file',
            entities: ['dist/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            name: this.getString(`DB_DATABASE_PROD`).toLowerCase() + `_${suffix}`,
        };
    }
    
    get typeOrmConfig(): TypeOrmModuleOptions {
        return this.getTypeOrmConfig('MAIN');
    }

    get typeOrmConfig1(): TypeOrmModuleOptions {
        return this.getTypeOrmConfig('READ_REPLICA');
    }

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
