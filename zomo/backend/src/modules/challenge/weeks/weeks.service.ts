import { appConstant, CommonFileService, tableConstant, WeeksEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WeeksService {
    constructor(
        @InjectRepository(WeeksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeeksRepository: Repository<WeeksEntity>,
        @InjectRepository(WeeksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeeksRepository: Repository<WeeksEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaWeeksRepository.create(data);
        return await this.writeReplicaWeeksRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWeeksRepository.metadata);
        return await this.writeReplicaWeeksRepository.createQueryBuilder('w')
            .update(WeeksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaWeeksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksRepository.find({
            where: condition,
            order: orderBy,
        });
    }   
    async listRecordJoinChallenge(condition: any, orderBy: any = null, join: string = 'ac', fields: any = []) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        let query =  await this.readReplicaWeeksRepository.createQueryBuilder('ch_weeks');
        if(join == 'ch'){
            query = query
            .leftJoinAndMapOne(
                'ch_weeks.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
                'ch',
                `ch.id = ch_weeks.activity_id`,
            )
        }else{
            query= query
            .leftJoinAndMapOne(
                'ch_weeks.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ch_weeks.activity_id`,
            )  
        }
        if(fields.length > 0){
            query = query.select(fields);
        }
        query = query.orderBy(`ch_weeks.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
      return query.where(condition)
      .getMany();
    } 
    async listRecordHealthyHabit(condition: any, orderBy: any = null, user_id: string, challenge_id: string, scheduleuserid: string) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksRepository.createQueryBuilder('ch_weeks')
        .leftJoinAndMapOne(
            'ch_weeks.weekuser',
            tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS,
            'weekuser',
            `ch_weeks.id = weekuser.week_id AND weekuser.user_id = ${user_id} AND weekuser.schedule_id = ${scheduleuserid} AND weekuser.challenge_id = ${challenge_id}`,
        )
        .leftJoinAndMapMany(
            'ch_weeks.days',
            tableConstant.CHALLENGE.TBL_CH_DAYS,
            'days',
            `ch_weeks.id = days.week_id AND days.challenge_id = ${challenge_id}`,
        )
        .leftJoinAndMapOne(
            'days.dayuser',
            tableConstant.CHALLENGE.TBL_CH_DAYS_USERS,
            'dayuser',
            `dayuser.day_id = days.id AND dayuser.user_id = ${user_id} AND dayuser.schedule_id = ${scheduleuserid} AND dayuser.challenge_id = ${challenge_id}`,
        )
        .where(condition)
        .orderBy(`ch_weeks.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    } 
}
