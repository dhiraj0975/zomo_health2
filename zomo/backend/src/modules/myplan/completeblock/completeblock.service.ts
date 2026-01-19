import { appConstant, CommonFileService, MyPlanCompleteBlockEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanCompleteBlockService {
    constructor(
        @InjectRepository(MyPlanCompleteBlockEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanCompleteBlockRepository: Repository<MyPlanCompleteBlockEntity>,
        @InjectRepository(MyPlanCompleteBlockEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanCompleteBlockRepository: Repository<MyPlanCompleteBlockEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanCompleteBlockRepository.create(data);
        return await this.writeReplicaMyPlanCompleteBlockRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanCompleteBlockRepository.metadata);
        return await this.writeReplicaMyPlanCompleteBlockRepository.createQueryBuilder('cb')
            .update(MyPlanCompleteBlockEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanCompleteBlockRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanCompleteBlockRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['completeblock.*'],) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return this.readReplicaMyPlanCompleteBlockRepository.createQueryBuilder('completeblock')
        .leftJoinAndMapOne(
            'completeblock.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = completeblock.activity_id`
        )
        .leftJoinAndMapOne(
            'completeblock.user',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'user',
            `user.id = completeblock.user_id`
        )
        .where(condition)
        .select(fields)
        .orderBy(`completeblock.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
}
