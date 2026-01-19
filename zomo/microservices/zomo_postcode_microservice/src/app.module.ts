import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppTimezoneConfigModule } from './config/app-config.module';
import { AppTimezoneConfigProvider } from './config/app-config.provider';
import { CAPostCodesEntity, USPostCodesEntity, TimezonesEntity } from "./entity";
import { appConstant } from './constant';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [AppTimezoneConfigModule],
      name: appConstant.MAIN.toLowerCase(),
      useFactory: (configService: AppTimezoneConfigProvider) => {
          return {...configService.typeOrmConfig, name: configService.typeOrmConfig.name};
      },
      inject: [AppTimezoneConfigProvider],
  }),
  TypeOrmModule.forRootAsync({
      imports: [AppTimezoneConfigModule],
      name: appConstant.READ_REPLICA.toLowerCase(),
      useFactory: (configService: AppTimezoneConfigProvider) => {
          return {...configService.typeOrmConfig1, name: configService.typeOrmConfig1.name};
      },
      inject: [AppTimezoneConfigProvider],
  }),
    TypeOrmModule.forFeature([CAPostCodesEntity, USPostCodesEntity, TimezonesEntity], appConstant.READ_REPLICA.toLowerCase()),
    TypeOrmModule.forFeature([CAPostCodesEntity, USPostCodesEntity, TimezonesEntity], appConstant.MAIN.toLowerCase())
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
