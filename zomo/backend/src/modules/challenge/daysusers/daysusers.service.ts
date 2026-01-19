import { appConstant, CommonFileService, DaysUsersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class DaysUsersService {
    constructor(
        @InjectRepository(DaysUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDaysUsersRepository: Repository<DaysUsersEntity>,
        @InjectRepository(DaysUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDaysUsersRepository: Repository<DaysUsersEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaDaysUsersRepository.create(data);
        return await this.writeReplicaDaysUsersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDaysUsersRepository.metadata);
        return await this.writeReplicaDaysUsersRepository.createQueryBuilder('du')
            .update(DaysUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaDaysUsersRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDaysUsersRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['du','days','ac']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDaysUsersRepository.createQueryBuilder('du')
        .leftJoinAndMapOne(
            'du.days',
            tableConstant.CHALLENGE.TBL_CH_DAYS,
            'days',
            `days.id = du.day_id AND days.status = 1`,
        )
        .leftJoinAndMapOne(
            'du.ac',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'ac',
            `ac.id = du.activity_id AND ac.status = 1`,
        )
            .where(condition)
            .select(fields)
            .orderBy(`du.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
