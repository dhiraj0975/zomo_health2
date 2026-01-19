import {
    appConstant,
    BaseService,
    PhysicianTempsEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class PhysicianTempsService extends BaseService<PhysicianTempsEntity> {
    constructor(
        @InjectRepository(PhysicianTempsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaPhysicianTempsRepository: Repository<PhysicianTempsEntity>,
        @InjectRepository(PhysicianTempsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaPhysicianTempsRepository: Repository<PhysicianTempsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaPhysicianTempsRepository, writeReplicaPhysicianTempsRepository,'physicianTemps',commonArrayService);
    }

}