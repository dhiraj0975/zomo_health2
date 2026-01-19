import {appConstant, BaseService, CommonArrayService, CommonFileService, InterlinksEntity} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class InterlinksService extends BaseService<InterlinksEntity> {
    constructor(
        @InjectRepository(InterlinksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicainterlinksRepository: Repository<InterlinksEntity>,
        @InjectRepository(InterlinksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicainterlinksRepository: Repository<InterlinksEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicainterlinksRepository, writeReplicainterlinksRepository,'interLinks',commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                ? `interlinks.${paginationParam.order_by}`
                : 'interlinks.id';
        const queryResult = await this.readReplicainterlinksRepository.createQueryBuilder('interlinks')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicainterlinksRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null,fields: any = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicainterlinksRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicainterlinksRepository.create(data);
        return await this.writeReplicainterlinksRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicainterlinksRepository.metadata);
        return await this.writeReplicainterlinksRepository.createQueryBuilder('interlinks')
            .update(InterlinksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicainterlinksRepository.delete(condition);
    }
}