import { appConstant, CommonFileService, FitnessUsersActivityEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FitnessUsersActivityService {
    constructor(
        @InjectRepository(FitnessUsersActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessUsersActivityRepository: Repository<FitnessUsersActivityEntity>,
        @InjectRepository(FitnessUsersActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessUsersActivityRepository: Repository<FitnessUsersActivityEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessUsersActivityRepository.create(data);
        return await this.writeReplicaFitnessUsersActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessUsersActivityRepository.metadata);
        return await this.writeReplicaFitnessUsersActivityRepository.createQueryBuilder('aod')
            .update(FitnessUsersActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaFitnessUsersActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessUsersActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, group_by: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query =  this.readReplicaFitnessUsersActivityRepository.createQueryBuilder('activity')
        .where(condition);
        if(group_by){
            query = query.groupBy(group_by);
        }
        return await query
        .orderBy(`activity.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
}
