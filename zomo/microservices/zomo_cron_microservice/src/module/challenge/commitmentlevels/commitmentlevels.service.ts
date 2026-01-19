import { appConstant, BaseService, CommitmentLevelsEntity, CommonArrayService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CommitmentLevelsService extends BaseService<CommitmentLevelsEntity> {
    constructor(
        @InjectRepository(CommitmentLevelsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCommitmentLevelsRepository: Repository<CommitmentLevelsEntity>,
        @InjectRepository(CommitmentLevelsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCommitmentLevelsRepository: Repository<CommitmentLevelsEntity>,
        commonArrayService: CommonArrayService,
    ) {
         super(
            readReplicaCommitmentLevelsRepository,
            writeReplicaCommitmentLevelsRepository,
            'sc',
            commonArrayService,
        );
    }
    
    async getLevelsFromScheduleId(id) {
        const condition = {
            schedule_id: id,
            status: 1
        };
        const result = await this.readReplicaCommitmentLevelsRepository.createQueryBuilder('cl')
            .select(['cl.id', 'cl.level_value', 'cl.level_type'])
            .where(condition)
            .orderBy('cl.id', 'DESC')
            .getMany(); 
        return result;
    }
}
