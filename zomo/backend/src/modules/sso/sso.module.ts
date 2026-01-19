import {appConstant, SsoOrgMappingEntity, SsoToolEntity} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import {ssoOrgMappingController} from "./sso-org-mapping/sso-org-mapping.controller";
import {SsoOrgMappingService} from "./sso-org-mapping/sso-org-mapping.service";
import {SsoToolService} from "./sso-tool/sso-tool.service";
import {ssoToolController} from "./sso-tool/sso-tool.controller";
@Module({
    imports: [
        TypeOrmModule.forFeature([SsoOrgMappingEntity, SsoToolEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([SsoOrgMappingEntity, SsoToolEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        SsoOrgMappingService, SsoToolService,
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
    controllers: [ssoOrgMappingController, ssoToolController],
    exports: [SsoOrgMappingService, SsoToolService],
})
export class SsoModule {}
