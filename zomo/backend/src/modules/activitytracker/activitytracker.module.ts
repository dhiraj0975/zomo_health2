import { appConstant, CreateFormsEntity, SubmitedFormsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateFormsController } from "./createforms/createforms.controller";
import { CreateFormsService } from "./createforms/createforms.service";
import { SubmitFormsController } from "./submitforms/submitforms.controller";
import { SubmitFormsService } from "./submitforms/submitforms.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([CreateFormsEntity, SubmitedFormsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([CreateFormsEntity, SubmitedFormsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        CreateFormsService,SubmitFormsService,
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
    controllers: [CreateFormsController,SubmitFormsController],
    exports: [CreateFormsService,SubmitFormsService],
})
export class ActivityTrackerModule {}
