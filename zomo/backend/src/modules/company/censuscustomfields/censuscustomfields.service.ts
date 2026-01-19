import { appConstant, CensusCustomFieldsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PaginateInput } from "src/input";
import { Repository } from "typeorm";
@Injectable()
export class CensusCustomFieldsService {
    constructor(
        @InjectRepository(CensusCustomFieldsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        @InjectRepository(CensusCustomFieldsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCensusCustomFieldsRepository: Repository<CensusCustomFieldsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaCensusCustomFieldsRepository.create(data);
        return await this.writeReplicaCensusCustomFieldsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCensusCustomFieldsRepository.metadata);
        return await this.writeReplicaCensusCustomFieldsRepository.createQueryBuilder('ccf')
            .update(CensusCustomFieldsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaCensusCustomFieldsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async listRecordReport(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        const data= await this.readReplicaCensusCustomFieldsRepository.find({
            where: condition,
            order: orderBy,
        });
        const listData = data.reduce((acc, item) => {
            if (item?.id && item?.title) {
                acc[Number(item.id)] = item.title; 
            }
            return acc;
        }, {}); 
        return listData;
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
                ? `censusCustomFields.${paginationParam.order_by}`
                : 'censusCustomFields.id';
        const queryResult = await this.readReplicaCensusCustomFieldsRepository.createQueryBuilder('censusCustomFields')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
