import { appConstant, AuthorizedUsersEntity, DeviceConfigurationsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizedUsersController } from "./authorizedusers/authorizedusers.controller";
import { AuthorizedUsersService } from "./authorizedusers/authorizedusers.service";
import { DeviceConfigurationsController } from "./deviceconfigurations/deviceconfigurations.controller";
import { DeviceConfigurationsService } from "./deviceconfigurations/deviceconfigurations.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([ AuthorizedUsersEntity, DeviceConfigurationsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([ AuthorizedUsersEntity, DeviceConfigurationsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [AuthorizedUsersService, DeviceConfigurationsService ],
    controllers: [AuthorizedUsersController, DeviceConfigurationsController ],
    exports: [AuthorizedUsersService, DeviceConfigurationsService ],
})
export class DeviceConfigurationModule {}
