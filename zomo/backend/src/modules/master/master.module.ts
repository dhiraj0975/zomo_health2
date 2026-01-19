import { appConstant, InstallPluginsEntity, LanguagesEntity, PermissionMethodEntity, RoleEntity, RolePermissionEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionService } from 'src/modules/permission/role-permission/role-permission.service';
import { PermissionMethodService } from '../permission/permission-method/permission-method.service';
import { ActivityLogService } from './activitylog/activitylog.service';
import { CensusController } from "./census/census.controller";
import { CustomPointController } from "./custompoint/custompoint.controller";
import { InstallPluginsController } from './installplugins/installplugins.controller';
import { InstallPluginsService } from './installplugins/installplugins.service';
import { LanguagesController } from "./languages/languages.controller";
import { LanguagesService } from "./languages/languages.service";
import { PostcodesController } from "./postcodes/postcodes.controller";
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { TimezoneController } from "./timezone/timezone.controller";
@Module({
    imports: [
        TypeOrmModule.forFeature([RoleEntity, PermissionMethodEntity, RolePermissionEntity, LanguagesEntity, InstallPluginsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([RoleEntity, PermissionMethodEntity, RolePermissionEntity, LanguagesEntity, InstallPluginsEntity], appConstant.MAIN.toLowerCase()),
    ],
    controllers: [RoleController, PostcodesController, LanguagesController, TimezoneController, CensusController, InstallPluginsController,CustomPointController],
    providers: [
        RoleService,
        PermissionMethodService,
        RolePermissionService,
        LanguagesService,
        InstallPluginsService,
        {
            provide: 'POSTCODES_SERVICE',
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
        {
            provide: 'ACTIVITYLOG_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.ACTIVITYLOG_SERVICE_HOST_PROD,
                        port: Number(process.env.ACTIVITYLOG_SERVICE_PORT_PROD),
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
        ActivityLogService,
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
            provide: 'CENSUS_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CENSUS_SERVICE_HOST_PROD,
                        port: Number(process.env.CENSUS_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    exports: [RoleService,PermissionMethodService,RolePermissionService,LanguagesService,ActivityLogService, InstallPluginsService],
})
export class MasterModule {}
