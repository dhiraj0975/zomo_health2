import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonService,
    MyPlanActivityEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanActivityService extends BaseService<MyPlanActivityEntity> {
    constructor(
        @InjectRepository(
            MyPlanActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanActivityRepository: Repository<MyPlanActivityEntity>,
        @InjectRepository(MyPlanActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanActivityRepository: Repository<MyPlanActivityEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanActivityRepository,
            writeReplicaMyPlanActivityRepository,
            'myPlanActivity',
            commonArrayService,
        );
    }
}
