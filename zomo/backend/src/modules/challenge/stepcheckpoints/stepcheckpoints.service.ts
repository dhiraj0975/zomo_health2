import { appConstant, CommonFileService, StepCheckpointsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class StepCheckpointsService {
    constructor(
        @InjectRepository(StepCheckpointsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaStepCheckpointsRepository: Repository<StepCheckpointsEntity>,
        @InjectRepository(StepCheckpointsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaStepCheckpointsRepository: Repository<StepCheckpointsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaStepCheckpointsRepository.create(data);
        return await this.writeReplicaStepCheckpointsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaStepCheckpointsRepository.metadata);
        return await this.writeReplicaStepCheckpointsRepository.createQueryBuilder('sc')
            .update(StepCheckpointsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaStepCheckpointsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null, fields: any=['sc']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaStepCheckpointsRepository.createQueryBuilder('sc')
            .select(fields)
            .where(condition)
            .orderBy(`sc.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any=['sc']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaStepCheckpointsRepository.createQueryBuilder('sc')
        .select(fields)
        .where(condition)
        .orderBy(`sc.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async getTotalTargetStepFromScheduleId(id) {
        const condition = {
            schedule_id: id,
            status: 1
        };
        const result = await this.readReplicaStepCheckpointsRepository.createQueryBuilder('sc')
            .select(['sc.checkpointvalue', 'sc.checkpointtype', 'sc.checkpointdays'])
            .where(condition)
            .orderBy('sc.checkpointdays', 'DESC')
            .getOne(); 
        return result ? result : false;
    }
}
