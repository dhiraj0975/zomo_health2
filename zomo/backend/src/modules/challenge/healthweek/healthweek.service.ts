import { appConstant, CommonFileService, HealthWeekEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class HealthWeekService {
    constructor(
        @InjectRepository(HealthWeekEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthWeekRepository: Repository<HealthWeekEntity>,
        @InjectRepository(HealthWeekEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthWeekRepository: Repository<HealthWeekEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaHealthWeekRepository.create(data);
        return await this.writeReplicaHealthWeekRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaHealthWeekRepository.metadata);
        return await this.writeReplicaHealthWeekRepository.createQueryBuilder('hw')
            .update(HealthWeekEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaHealthWeekRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthWeekRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
