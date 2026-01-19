import { ActivityFeedsEntity, appConstant, CommonArrayService, CommonDateService, CacheService, CommonFileService, CommonService, CompaniesEntity, FtAuthorizedUsersEntity, UserEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FitbitCommonService } from "./common";
import { AppTimezoneConfigModule } from './config/app-config.module';
import { AppFitbitConfigProvider } from './config/app-config.provider';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [AppTimezoneConfigModule],
      name: appConstant.MAIN.toLowerCase(),
      useFactory: (configService: AppFitbitConfigProvider) => {
          return {...configService.typeOrmConfig, name: configService.typeOrmConfig.name};
      },
      inject: [AppFitbitConfigProvider],
  }),
  TypeOrmModule.forRootAsync({
      imports: [AppTimezoneConfigModule],
      name: appConstant.READ_REPLICA.toLowerCase(),
      useFactory: (configService: AppFitbitConfigProvider) => {
          return {...configService.typeOrmConfig1, name: configService.typeOrmConfig1.name};
      },
      inject: [AppFitbitConfigProvider],
  }),
    TypeOrmModule.forFeature([FtAuthorizedUsersEntity, ActivityFeedsEntity, UserEntity, CompaniesEntity], appConstant.READ_REPLICA.toLowerCase()),
    TypeOrmModule.forFeature([FtAuthorizedUsersEntity, ActivityFeedsEntity, UserEntity, CompaniesEntity], appConstant.MAIN.toLowerCase())
  ],
  controllers: [AppController],
  providers: [
        FitbitCommonService,
        AppService,
        CommonService,
        CommonArrayService,
        CommonDateService,
        CacheService,
        CommonFileService
  ],
})
export class AppModule {}
