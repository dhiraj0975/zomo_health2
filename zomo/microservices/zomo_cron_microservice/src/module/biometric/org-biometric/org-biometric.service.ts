import {
    appConstant,
    BaseService,
    CommonArrayService,
    OrgBiometricEntity
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class OrgBiometricService extends BaseService<OrgBiometricEntity> {
    constructor(
        @InjectRepository(OrgBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOrgBiometricRepository: Repository<OrgBiometricEntity>,
        @InjectRepository(OrgBiometricEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOrgBiometricRepository: Repository<OrgBiometricEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaOrgBiometricRepository,writeReplicaOrgBiometricRepository,'orgBiometric',commonArrayService);
    }

}