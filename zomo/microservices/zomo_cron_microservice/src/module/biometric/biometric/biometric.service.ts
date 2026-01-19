import {
    appConstant,
    BaseService,
    BiometricEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class BiometricService extends BaseService<BiometricEntity> {
    constructor(
        @InjectRepository(BiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBirBiometricRepository: Repository<BiometricEntity>,
        @InjectRepository(BiometricEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBirBiometricRepository: Repository<BiometricEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaBirBiometricRepository, writeReplicaBirBiometricRepository,'birBiometric',commonArrayService);
    }

}