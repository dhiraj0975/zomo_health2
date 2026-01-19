import { AcOlympicDataEntity, appConstant, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AcOlympicDataService {
    constructor(
        @InjectRepository(AcOlympicDataEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAcOlympicDataRepository: Repository<AcOlympicDataEntity>,
        @InjectRepository(AcOlympicDataEntity ,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAcOlympicDataRepository: Repository<AcOlympicDataEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        if(!data?.status){
            data['status'] = 1;
        }
        const savedResult = this.writeReplicaAcOlympicDataRepository.create(data);
        return await this.writeReplicaAcOlympicDataRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAcOlympicDataRepository.metadata);
        return await this.writeReplicaAcOlympicDataRepository.createQueryBuilder('aod')
            .update(AcOlympicDataEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaAcOlympicDataRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAcOlympicDataRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, group_by: any = null) {
        if (!orderBy) {
            orderBy = { added_date: 'DESC' };
        }
        if(group_by){
            return await this.readReplicaAcOlympicDataRepository.createQueryBuilder('cod')
            .leftJoinAndMapOne(
                'cod.challengeactivity',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
                'challengeactivity',
                `challengeactivity.id = cod.activity_id`,
            )
            .select('SUM(minutes) AS totalminutes, schedule_id, activity_id')
            .where(condition)
            .groupBy('activity_id')
            .getRawMany();
        }
        return await this.readReplicaAcOlympicDataRepository.createQueryBuilder('aod')
        .leftJoinAndMapOne(
            'aod.challengeactivity',
            tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
            'challengeactivity',
            `challengeactivity.id = aod.activity_id`,
        )
            .where(condition)
            .select(['aod', 'challengeactivity.id','challengeactivity.activity_name','challengeactivity.activity_desc','challengeactivity.colorcode'])
            .orderBy(`aod.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
