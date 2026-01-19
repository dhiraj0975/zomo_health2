import {
    appConstant,
    BaseService,
    BiometricOrgSettingEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class BiometricOrgSettingService extends BaseService<BiometricOrgSettingEntity> {
    constructor(
        @InjectRepository(BiometricOrgSettingEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricOrgRepository: Repository<BiometricOrgSettingEntity>,
        @InjectRepository(BiometricOrgSettingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricOrgRepository: Repository<BiometricOrgSettingEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaBiometricOrgRepository,writeReplicaBiometricOrgRepository,'biometricOrgSetting',commonArrayService);
    }

}