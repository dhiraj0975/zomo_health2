import {
    appConstant,
    BaseService,
    CommonArrayService,
    MyPlanAssignPlanEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignPlanService extends BaseService<MyPlanAssignPlanEntity> {
    constructor(
        @InjectRepository(
            MyPlanAssignPlanEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        @InjectRepository(
            MyPlanAssignPlanEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanAssignPlanRepository,
            writeReplicaMyPlanAssignPlanRepository,
            'assignPlan',
            commonArrayService,
        );
    }
}
