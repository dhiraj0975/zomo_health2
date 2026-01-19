import { appConstant, AutoReportSettingsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoReportSettingController } from './autoReportSettings.cotroller';
import { AutoReportSettingService } from './autoReportSettings.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([AutoReportSettingsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([AutoReportSettingsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        AutoReportSettingService,
        {
            provide: 'CRON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CRON_SERVICE_HOST_PROD,
                        port: Number(process.env.CRON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'TIMEZONE_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    controllers: [AutoReportSettingController],
    exports: [AutoReportSettingService],
})
export class AutoReportSettingsModule {}
