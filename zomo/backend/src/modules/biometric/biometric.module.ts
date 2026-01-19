import { appConstant, BiometricEntity, BiometricOrgSettingEntity, OrgBiometricEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiometricController } from './biometric/biometric.controller';
import { BiometricService } from './biometric/biometric.service';
import { BiometricOrgSettingController } from './biometricOrgSetting/biometricOrgSetting.controller';
import { BiometricOrgSettingService } from './biometricOrgSetting/biometricOrgSetting.service';
import { OrgBiometricController } from "./orgBiometric/orgBiometric.controller";
import { OrgBiometricService } from "./orgBiometric/orgBiometric.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([BiometricEntity, BiometricOrgSettingEntity, OrgBiometricEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([BiometricEntity, BiometricOrgSettingEntity, OrgBiometricEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [BiometricService, BiometricOrgSettingService, OrgBiometricService],
    controllers: [BiometricController, BiometricOrgSettingController, OrgBiometricController],
    exports: [BiometricService, BiometricOrgSettingService, OrgBiometricService],
})
export class BiometricModule {}
