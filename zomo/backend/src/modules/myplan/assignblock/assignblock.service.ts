import { appConstant, CommonFileService, MyPlanAssignBlockEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignBlockService {
    constructor(
        @InjectRepository(MyPlanAssignBlockEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignBlockRepository: Repository<MyPlanAssignBlockEntity>,
        @InjectRepository(MyPlanAssignBlockEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanAssignBlockRepository: Repository<MyPlanAssignBlockEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanAssignBlockRepository.create(data);
        return await this.writeReplicaMyPlanAssignBlockRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanAssignBlockRepository.metadata);
        return await this.writeReplicaMyPlanAssignBlockRepository.createQueryBuilder('maa')
            .update(MyPlanAssignBlockEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanAssignBlockRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null): Promise<MyPlanAssignBlockEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignBlockRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any,field: any[] = [], orderBy: any = null): Promise<MyPlanAssignBlockEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignBlockRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
}
