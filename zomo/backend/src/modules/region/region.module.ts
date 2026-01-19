import { appConstant, RegionEntity, RegionStateCityEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionsController } from "./regions/regions.controller";
import { RegionsService } from "./regions/regions.service";
import { StateCityController } from "./stateCity/stateCity.controller";
import { StateCityService } from "./stateCity/stateCity.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([RegionStateCityEntity, RegionEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([RegionStateCityEntity, RegionEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [StateCityService, RegionsService],
    controllers: [StateCityController, RegionsController],
    exports: [StateCityService, RegionsService],
})
export class RegionModule {}
