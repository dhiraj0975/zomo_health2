import {
    appConstant,
    BaseService,
    CommonArrayService,
    WellnessAssignmentEntity
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class WellnessAssignmentService  extends BaseService<WellnessAssignmentEntity> {
    constructor(
        @InjectRepository(WellnessAssignmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicawellnessAssignmentRepository: Repository<WellnessAssignmentEntity>,
        @InjectRepository(WellnessAssignmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicawellnessAssignmentRepository: Repository<WellnessAssignmentEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicawellnessAssignmentRepository, writeReplicawellnessAssignmentRepository, 'wellnessAssignment',commonArrayService);
    }
}