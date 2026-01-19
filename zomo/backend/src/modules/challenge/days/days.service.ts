import { appConstant, CommonFileService, DaysEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class DaysService {
    constructor(
        @InjectRepository(DaysEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDaysRepository: Repository<DaysEntity>,
        @InjectRepository(DaysEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDaysRepository: Repository<DaysEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaDaysRepository.create(data);
        return await this.writeReplicaDaysRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDaysRepository.metadata);
        return await this.writeReplicaDaysRepository.createQueryBuilder('d')
            .update(DaysEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaDaysRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDaysRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDaysRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async listRecordJoinChallenge(condition: any, orderBy: any = null, join: string = 'ac', fields: any = []) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        let query =  await this.readReplicaDaysRepository.createQueryBuilder('ch_days');
        if(join == 'ch'){
            query = query
            .leftJoinAndMapOne(
                'ch_days.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
                'ch',
                `ch.id = ch_days.activity_id`,
            )
        }else{
            query= query
            .leftJoinAndMapOne(
                'ch_days.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ch_days.activity_id`,
            )  
        }
        if(fields.length > 0){
            query = query.select(fields);
        }
        query = query.orderBy(`ch_days.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        return query.where(condition).getMany();
    }
}
