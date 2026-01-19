import { appConstant, CommonFileService, ScheduleChallengeAgreementEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ScheduleChallengeAgreementService {
    constructor(
        @InjectRepository(ScheduleChallengeAgreementEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeAgreementRepository: Repository<ScheduleChallengeAgreementEntity>,
        @InjectRepository(ScheduleChallengeAgreementEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaScheduleChallengeAgreementRepository: Repository<ScheduleChallengeAgreementEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaScheduleChallengeAgreementRepository.create(data);
        return await this.writeReplicaScheduleChallengeAgreementRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaScheduleChallengeAgreementRepository.metadata);
        return await this.writeReplicaScheduleChallengeAgreementRepository.createQueryBuilder('sca')
            .update(ScheduleChallengeAgreementEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaScheduleChallengeAgreementRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaScheduleChallengeAgreementRepository.createQueryBuilder('sca')
        .leftJoinAndMapOne(
            'sca.scheduleChallenge',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
            'sc',
            `sc.id = sca.schedule_id AND sc.status = 1`,
            )
        .where(condition)
        .select(['sca','sc.id', 'sc.org_id'])
        .orderBy(`sca.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
}
