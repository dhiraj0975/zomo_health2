import { appConstant, UcaManualUpComingsEntity, UcaSettingEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualUpComingsController } from "./manualupcomings/manualupcomings.controller";
import { ManualUpcomingsService } from "./manualupcomings/manualupcomings.service";
import { SettingController } from "./setting/setting.controller";
import { SettingService } from "./setting/setting.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([UcaManualUpComingsEntity,UcaSettingEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([UcaManualUpComingsEntity,UcaSettingEntity], appConstant.MAIN.toLowerCase()),],
    providers: [
        ManualUpcomingsService,SettingService
    ],
    controllers: [ManualUpComingsController,SettingController],
    exports: [ManualUpcomingsService, SettingService],
})
export class UpcomingActivitiesModule {}
