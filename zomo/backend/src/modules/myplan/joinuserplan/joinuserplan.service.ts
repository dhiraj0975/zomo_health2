import {
    appConstant, BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanJoinUserPlanEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanJoinUserPlanService extends BaseService<MyPlanJoinUserPlanEntity> {
    constructor(
        @InjectRepository(MyPlanJoinUserPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanJoinUserPlanRepository: Repository<MyPlanJoinUserPlanEntity>,
        @InjectRepository(MyPlanJoinUserPlanEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanJoinUserPlanRepository: Repository<MyPlanJoinUserPlanEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaMyPlanJoinUserPlanRepository,writeReplicaMyPlanJoinUserPlanRepository,'joinUserPlan',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanJoinUserPlanRepository.create(data);
        return await this.writeReplicaMyPlanJoinUserPlanRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanJoinUserPlanRepository.metadata);
        return await this.writeReplicaMyPlanJoinUserPlanRepository.createQueryBuilder('jup')
            .update(MyPlanJoinUserPlanEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanJoinUserPlanRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanJoinUserPlanRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['joinplan.*'],) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return this.readReplicaMyPlanJoinUserPlanRepository.createQueryBuilder('joinplan')
        .leftJoinAndMapOne(
            'joinplan.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = joinplan.activity_id`
        )
        .leftJoinAndMapOne(
            'joinplan.user',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'user',
            `user.id = joinplan.user_id`
        )
        .where(condition)
        .select(fields)
        .orderBy(`joinplan.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
}
