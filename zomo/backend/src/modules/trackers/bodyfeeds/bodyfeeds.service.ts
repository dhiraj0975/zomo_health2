import { appConstant, BodyFeedsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFoodInput } from '../input';
@Injectable()
export class BodyFeedService {
    constructor(
        @InjectRepository(BodyFeedsEntity, appConstant.READ_REPLICA.toLowerCase())
            private readonly readReplicaBodyFeedsRepository: Repository<BodyFeedsEntity>,
        @InjectRepository(BodyFeedsEntity, appConstant.MAIN.toLowerCase())
            private readonly writeReplicaBodyFeedsRepository: Repository<BodyFeedsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithFoodInput) {
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
                ? paginationParam.order_by
                : 'food.added_date';
        const queryResult = await this.readReplicaBodyFeedsRepository.createQueryBuilder('food')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaBodyFeedsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any[] = []) {
        if (!orderBy) {
            orderBy = { 'bf.id': 'DESC' };
        }
        return await this.readReplicaBodyFeedsRepository.createQueryBuilder('bf')
            .select(fields)
            .where(condition)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBodyFeedsRepository.create(data);
        return await this.writeReplicaBodyFeedsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBodyFeedsRepository.metadata);
        return await this.writeReplicaBodyFeedsRepository.createQueryBuilder('food')
            .update(BodyFeedsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaBodyFeedsRepository.delete(condition);
    }
}