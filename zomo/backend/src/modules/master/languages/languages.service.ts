import { LanguageInterface } from '@/interface';
import { appConstant, CommonArrayService, CommonFileService, LanguagesEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
import { ActivityLogService } from "../activitylog/activitylog.service";
@Injectable()
export class LanguagesService {
    constructor(
        @InjectRepository(LanguagesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLanguageRepository: Repository<LanguagesEntity>,
        @InjectRepository(LanguagesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLanguageRepository: Repository<LanguagesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
    ) {
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
                ? paginationParam.order_by
                : 'language.id';
        const queryResult = await this.readReplicaLanguageRepository.createQueryBuilder('language')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaLanguageRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null): Promise<LanguageInterface[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaLanguageRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaLanguageRepository.create(data);
        return await this.writeReplicaLanguageRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaLanguageRepository.metadata);
        return await this.writeReplicaLanguageRepository.createQueryBuilder('language')
            .update(LanguagesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaLanguageRepository.delete(condition);
    }
    async updateOrder(data: any, req: Request) {
    let i = 0;
    for(let id of data.order) {
        await this.writeReplicaLanguageRepository.createQueryBuilder('language')
            .update(LanguagesEntity)
            .set({weight: ++i})
            .where({id})
            .execute();
            this.activityLogService.create({id:id, weight: 0}, {weight: i}, tableConstant.TBL_LANGUAGES, req.tokenUser?.id);
    }
    }
    async getCount(condition: any) {       
        return await this.readReplicaLanguageRepository.createQueryBuilder('language')
        .where(condition)
        .orderBy('weight', 'DESC')
        .getOne();
    }
}