import { appConstant, CommonFileService, FitnessActivityEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FitnessActivityService {
    constructor(
        @InjectRepository(FitnessActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessActivityRepository: Repository<FitnessActivityEntity>,
        @InjectRepository(FitnessActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessActivityRepository: Repository<FitnessActivityEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaFitnessActivityRepository.create(data);
        return await this.writeReplicaFitnessActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFitnessActivityRepository.metadata);
        return await this.writeReplicaFitnessActivityRepository.createQueryBuilder('fa')
            .update(FitnessActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaFitnessActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFitnessActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaFitnessActivityRepository.find({
            where: condition,
            order: orderBy,
        });
    }
}
