import {
    appConstant, MarketingCareerEntity,
    MarketingEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingCareerService } from './marketingcareer.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingEntity,MarketingCareerEntity], appConstant.READ_REPLICA.toLowerCase()),
    TypeOrmModule.forFeature([MarketingEntity,MarketingCareerEntity], appConstant.MAIN.toLowerCase()),
  ],
  providers: [MarketingService,MarketingCareerService,
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
    },
  ],
  controllers: [MarketingController],
  exports: [MarketingService,MarketingCareerService],
})
export class MarketingModule { }
