import { appConstant, BingoWeekLabelsEntity, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class BingoWeekLabelsService {
    constructor(
        @InjectRepository(BingoWeekLabelsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBingoWeekLabelsRepository: Repository<BingoWeekLabelsEntity>,
        @InjectRepository(BingoWeekLabelsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBingoWeekLabelsRepository: Repository<BingoWeekLabelsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaBingoWeekLabelsRepository.create(data);
        return await this.writeReplicaBingoWeekLabelsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBingoWeekLabelsRepository.metadata);
        return await this.writeReplicaBingoWeekLabelsRepository.createQueryBuilder('bwl')
            .update(BingoWeekLabelsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaBingoWeekLabelsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBingoWeekLabelsRepository.createQueryBuilder('bwl')
            .leftJoinAndMapOne(
                'bwl.scheduleChallenge',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'sc',
                `sc.id = bwl.schedule_id AND sc.status != 2`,
                )
            .where(condition)
            .select(['bwl','sc.id', 'sc.org_id'])
            .orderBy(`bwl.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBingoWeekLabelsRepository.createQueryBuilder('bwl')
            .leftJoinAndMapOne(
                'bwl.scheduleChallenge',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'sc',
                `sc.id = bwl.schedule_id AND sc.status = 1`,
                )
            .where(condition)
            .select(['bwl','sc.id', 'sc.org_id'])
            .orderBy(`bwl.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
