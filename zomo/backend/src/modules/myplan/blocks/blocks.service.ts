import { appConstant, CommonArrayService, CommonFileService, MyPlanBlocksEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanBlocksService {
    constructor(
        @InjectRepository(MyPlanBlocksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanBlocksRepository: Repository<MyPlanBlocksEntity>,
        @InjectRepository(MyPlanBlocksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanBlocksRepository: Repository<MyPlanBlocksEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? `blocks.${paginationParam.order_by}`
                : 'blocks.id';
        let queryResult = await this.readReplicaMyPlanBlocksRepository.createQueryBuilder('blocks')
            .select(fields)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanBlocksRepository.create(data);
        return await this.writeReplicaMyPlanBlocksRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanBlocksRepository.metadata);
        return await this.writeReplicaMyPlanBlocksRepository.createQueryBuilder('b')
            .update(MyPlanBlocksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanBlocksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanBlocksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null): Promise<MyPlanBlocksEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanBlocksRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
