import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonService,
    MyPlanBlocksEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanBlocksService extends BaseService<MyPlanBlocksEntity> {
    constructor(
        @InjectRepository(
            MyPlanBlocksEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaMyPlanBlocksRepository: Repository<MyPlanBlocksEntity>,
        @InjectRepository(MyPlanBlocksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanBlocksRepository: Repository<MyPlanBlocksEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaMyPlanBlocksRepository,
            writeReplicaMyPlanBlocksRepository,
            'blocks',
            commonArrayService,
        );
    }
}
