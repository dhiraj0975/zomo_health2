import {
    appConstant,
    AssessmentTabsEntity,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
@Injectable()
export class AssessmentTabsService extends BaseService<AssessmentTabsEntity> {
    constructor(
        @InjectRepository(AssessmentTabsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentTabsRepository: Repository<AssessmentTabsEntity>,
        @InjectRepository(AssessmentTabsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentTabsRepository: Repository<AssessmentTabsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaAssessmentTabsRepository, writeReplicaAssessmentTabsRepository, 'assessmentTabs', commonArrayService);
    }

}