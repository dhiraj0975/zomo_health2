import { appConstant, SpouseAgreementsEntity, SpouseEntity, UserEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpouseController } from "./spouse/spouse.controller";
import { SpouseService } from "./spouse/spouse.service";
import { SpouseAgreementController } from "./spouseAgreement/spouseAgreement.controller";
import { SpouseAgreementService } from "./spouseAgreement/spouseAgreement.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([SpouseAgreementsEntity, SpouseEntity, UserEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([SpouseAgreementsEntity, SpouseEntity, UserEntity], appConstant.MAIN.toLowerCase())
    ],
    providers: [SpouseAgreementService, SpouseService,
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
    controllers: [SpouseAgreementController, SpouseController],
    exports: [SpouseAgreementService, SpouseService],
})
export class SpouseModule {}
