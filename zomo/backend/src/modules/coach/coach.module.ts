import { appConstant, CoachesEntity, CoachNotesEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachesController } from "./coaches/coaches.controller";
import { CoachesService } from "./coaches/coaches.service";
import { CoachHelperService } from './coaches/coachhelper.service';
import { CoachNotesController } from "./coachnotes/coachnotes.controller";
import { CoachNotesService } from "./coachnotes/coachnotes.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([CoachesEntity, CoachNotesEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([CoachesEntity, CoachNotesEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [ CoachesService, CoachNotesService, CoachHelperService, {
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
    },],
    controllers: [ CoachesController, CoachNotesController],
    exports: [ CoachesService, CoachNotesService, CoachHelperService],
})
export class CoachModule {}
