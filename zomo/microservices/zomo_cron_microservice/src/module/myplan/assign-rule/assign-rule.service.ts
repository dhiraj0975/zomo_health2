import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanAssignRuleEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignRuleService extends BaseService<MyPlanAssignRuleEntity> {
    constructor(
        @InjectRepository(
            MyPlanAssignRuleEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanAssignRuleRepository: Repository<MyPlanAssignRuleEntity>,
        @InjectRepository(
            MyPlanAssignRuleEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaMyPlanAssignRuleRepository: Repository<MyPlanAssignRuleEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanAssignRuleRepository,
            writeReplicaMyPlanAssignRuleRepository,
            'assignRule',
            commonArrayService,
        );
    }
}
