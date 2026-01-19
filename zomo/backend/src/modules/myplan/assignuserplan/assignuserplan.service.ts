import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanAssignUserPlanEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignUserPlanService  extends BaseService<MyPlanAssignUserPlanEntity> {
    constructor(
        @InjectRepository(MyPlanAssignUserPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignUserPlanRepository: Repository<MyPlanAssignUserPlanEntity>,
        @InjectRepository(MyPlanAssignUserPlanEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanAssignUserPlanRepository: Repository<MyPlanAssignUserPlanEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaMyPlanAssignUserPlanRepository,writeReplicaMyPlanAssignUserPlanRepository,'assignUserPlan',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanAssignUserPlanRepository.create(data);
        return await this.writeReplicaMyPlanAssignUserPlanRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanAssignUserPlanRepository.metadata);
        return await this.writeReplicaMyPlanAssignUserPlanRepository.createQueryBuilder('aup')
            .update(MyPlanAssignUserPlanEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanAssignUserPlanRepository.delete(condition);
    }
    async findOne(condition: any,select: any = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignUserPlanRepository.findOne({
            where: condition,
            select: select,
            order: orderBy,
        });
    }
}
