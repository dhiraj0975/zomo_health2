import { appConstant, CommonFileService, tableConstant, WeeksStepsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WeeksStepsService {
    constructor(
        @InjectRepository(WeeksStepsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeeksStepsRepository: Repository<WeeksStepsEntity>,
        @InjectRepository(WeeksStepsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeeksStepsRepository: Repository<WeeksStepsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaWeeksStepsRepository.create(data);
        return await this.writeReplicaWeeksStepsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWeeksStepsRepository.metadata);
        return await this.writeReplicaWeeksStepsRepository.createQueryBuilder('ws')
            .update(WeeksStepsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaWeeksStepsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksStepsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksStepsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async getTeamMemberWeekStartDates(condition: any, user_id: string = null) {
        let cond = `joinUser.schedule_id = ws.schedule_id`;
        if(user_id){
            cond += ` AND joinUser.user_id IN (${user_id}) AND joinUser.status = 1`;
        }
        return await this.readReplicaWeeksStepsRepository.createQueryBuilder('ws')
        .leftJoinAndMapMany(
            'ws.joinUser',
            tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
            'joinUser',
            cond,
          )
        .where(condition)
        .andWhere('DATE(ws.start_date) <= DATE(joinUser.added_date)')
        .andWhere('DATE(ws.end_date) >= DATE(joinUser.added_date)')
        .select('joinUser.user_id, ws.start_date')
        .getRawMany();
    }
    async getWeekStartDates(condition: any) {
        return await this.readReplicaWeeksStepsRepository.createQueryBuilder('ws')
        .where(condition)
        .select(['ws.id', 'ws.start_date'])
        .getOne();
    }
}
