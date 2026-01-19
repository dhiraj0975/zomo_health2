import {
    appConstant,
    ImportUserRequestEntity,
    UserEntity,
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportUserRequestService } from './importuserrequest/importuserrequest.service';
@Module({
    imports: [
        TypeOrmModule.forFeature(
            [UserEntity, ImportUserRequestEntity],
            appConstant.READ_REPLICA.toLowerCase(),
        ),
        TypeOrmModule.forFeature(
            [UserEntity, ImportUserRequestEntity],
            appConstant.MAIN.toLowerCase(),
        ),
    ],
    providers: [
        ImportUserRequestService,
        {
            provide: 'POSTCODES_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    },
                });
            },
        },
    ],
    exports: [ImportUserRequestService],
})
export class UserModule {}
