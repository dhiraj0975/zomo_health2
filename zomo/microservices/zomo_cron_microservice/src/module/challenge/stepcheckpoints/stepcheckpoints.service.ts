import { appConstant, BaseService, CommonArrayService, StepCheckpointsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class StepCheckpointsService extends BaseService<StepCheckpointsEntity> {
    constructor(
        @InjectRepository(StepCheckpointsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaStepCheckpointsRepository: Repository<StepCheckpointsEntity>,
        @InjectRepository(StepCheckpointsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaStepCheckpointsRepository: Repository<StepCheckpointsEntity>,
        commonArrayService: CommonArrayService,
    ) {
         super(
            readReplicaStepCheckpointsRepository,
            writeReplicaStepCheckpointsRepository,
            'sc',
            commonArrayService,
        );
    }
    async getTotalTargetStepFromScheduleId(id) {
        const condition = {
            schedule_id: id,
            status: 1
        };
        const result = await this.readReplicaStepCheckpointsRepository.createQueryBuilder('sc')
            .select(['sc.id', 'sc.checkpointvalue', 'sc.checkpointtype', 'sc.checkpointdays'])
            .where(condition)
            .orderBy('sc.checkpointdays', 'DESC')
            .getMany(); 
        return result;
    }
}
