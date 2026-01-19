import {appConstant, CommonFileService, CacheService} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { Translator } from './translator';
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
@Module({
    providers: [
        TranslationService,
        {
            provide: Translator,
            useFactory: (commonService: ClientProxy, cacheService: CacheService,) => {
                return new Translator(TRANSLATIONS_DIR, commonService, cacheService);
            },
            inject: ['COMMON_SERVICE', CacheService]
        },
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD ,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    }
                })
            }
        }
    ],
    controllers: [TranslationController],
    exports: [TranslationService],
})
export class TranslationModule {}
