import { appConstant, CommonFileService, tableConstant, WeeksUsersEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcOlympicDataService } from '../acolympicdata/acolympicdata.service';
@Injectable()
export class WeeksUsersService {
    constructor(
        @InjectRepository(WeeksUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeeksUsersRepository: Repository<WeeksUsersEntity>,
        @InjectRepository(WeeksUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeeksUsersRepository: Repository<WeeksUsersEntity>,
        private readonly commonFileService: CommonFileService,
        private readonly acOlympicDataService: AcOlympicDataService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaWeeksUsersRepository.create(data);
        return await this.writeReplicaWeeksUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWeeksUsersRepository.metadata);
        return await this.writeReplicaWeeksUsersRepository.createQueryBuilder('ws')
            .update(WeeksUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaWeeksUsersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaWeeksUsersRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, scheduleId: any) {
        let olympicData = await this.acOlympicDataService.listRecord(`cod.schedule_id = ${scheduleId} AND challengeactivity.id IS NOT NULL AND cod.status = 1`,null,true);
        let weekUser = await this.readReplicaWeeksUsersRepository.createQueryBuilder('cwu')
            .leftJoinAndMapOne(
                'cwu.challengeactivity',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
                'challengeactivity',
                `challengeactivity.id = cwu.activity_id`,
            )
            .where(condition)
            .select(['cwu.id','cwu.activity_id','cwu.schedule_id','cwu.m_numeric','cwu.status', 'challengeactivity.id','challengeactivity.activity_name','challengeactivity.activity_desc','challengeactivity.colorcode'])
            .orderBy('cwu.id', 'ASC')
            .getMany();
            return olympicData && olympicData.length ? weekUser.map((ele: any)=>{
                const data = olympicData.find((e)=> e.schedule_id == ele.schedule_id  && e.activity_id == ele.activity_id);
                ele['totalminutes']= data ? parseInt(data['totalminutes']) : 0;
                ele['m_numeric'] = ele['m_numeric'] ? parseInt(ele['m_numeric']) : 0;
                return ele;
            }) : weekUser;
    }
    async list(condition: any) {
        let weekUser = await this.readReplicaWeeksUsersRepository.createQueryBuilder('cwu')
            .where(condition)
            .orderBy('cwu.id', 'ASC')
            .getMany();
            return weekUser;
    }
}
