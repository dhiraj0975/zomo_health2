import { appConstant, CommonArrayService, CommonFileService, EmotionalWellBeingPostEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { PaginateWithEmotionalWellBeingInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
@Injectable()
export class WellBeingPostService {
    constructor(
        @InjectRepository(EmotionalWellBeingPostEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingPostRepository: Repository<EmotionalWellBeingPostEntity>,
        @InjectRepository(EmotionalWellBeingPostEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingPostRepository: Repository<EmotionalWellBeingPostEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService
    ) {
    }
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithEmotionalWellBeingInput, req: Request = null) {
        try{
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
                    : 'wb.id';
            let queryResult: any = this.readReplicaWellbeingPostRepository.createQueryBuilder('wb')
            if (paginationParam && paginationParam.org_id && paginationParam.cat_id) {
                if (paginationParam && paginationParam.saved_videos && paginationParam.is_valid) {
                    queryResult = queryResult
                        .innerJoinAndMapOne(
                            'wb.settings',
                            tableConstant.TBL_USERS_SETTINGS,
                            'settings',
                            `settings.user_id = ${paginationParam.user_id} AND settings.videofavoriteslist != "" AND settings.videofavoriteslist LIKE CONCAT('%"', wb.id, '":"', wb.id, '"%')`,
                        )
                        .select(fields)
                        .where(condition)
                        .addOrderBy(orderBy, <any>order)
                    if (paginationParam.sort_by && paginationParam.sort_by == 2) {
                        queryResult = queryResult.addOrderBy("wb.atime", "DESC")
                    }
                    queryResult = await queryResult
                        .take(paginateObj.take)
                        .skip(paginateObj.skip)
                        .getManyAndCount();
                } else {
                    queryResult = queryResult
                        .leftJoinAndMapOne(
                            'wb.settings',
                            tableConstant.TBL_USERS_SETTINGS,
                            'settings',
                            `settings.user_id = ${paginationParam.user_id} AND settings.videofavoriteslist != ""`,
                        )
                        .select(fields)
                        .addSelect(`CASE WHEN settings.videofavoriteslist LIKE CONCAT('%"', wb.id, '":"', wb.id, '"%') THEN 1 ELSE 0 END`, 'fav_order_by')
                        .where(condition)
                        .orderBy("fav_order_by", "DESC");
                    if (paginationParam.categories && !paginationParam.is_valid) {
                        let categoriesArr: any = typeof paginationParam.categories == 'string' ? paginationParam.categories.split(',') : paginationParam.categories;
                        for (let i = 0; i < categoriesArr.length; i++) {
                            queryResult = queryResult.addSelect(`CASE WHEN wb.maincollection LIKE '%${this.commonFileService.quoteEscaper(categoriesArr[i])}%' THEN 1 ELSE 0 END`, `categories${i}`)
                                // .addOrderBy(`categories${i}`, "DESC")
                        }
                        if (paginationParam.sort_by && paginationParam.sort_by != 2) {
                            if (paginationParam.sort_by && paginationParam.sort_by == 3) {
                                queryResult = queryResult.addOrderBy("wb.title", "ASC")
                            }
                            if (paginationParam.sort_by && paginationParam.sort_by == 4) {
                                queryResult = queryResult.addOrderBy("wb.title", "DESC")
                            }
                        }
                    }
                    if (paginationParam.search_str && !paginationParam.is_valid) {
                        let searchStrArr: any = paginationParam.search_str;
                        for (let i = 0; i < searchStrArr.length; i++) {
                            queryResult = queryResult.addSelect(`CASE WHEN wb.title LIKE '%${this.commonFileService.quoteEscaper(searchStrArr[i])}%' THEN 1 ELSE 0 END`, `title${i}`)
                                .addOrderBy(`title${i}`, "DESC")
                        }
                    }
                    if ((paginationParam.duration_min && paginationParam.duration_max) && !paginationParam.is_valid) {
                        queryResult = queryResult.addSelect(`CASE WHEN wb.atime BETWEEN ${paginationParam.duration_min} AND ${paginationParam.duration_max} THEN 1 ELSE 0 END`, "duration")
                            .addOrderBy("duration", "DESC")
                    }
                    queryResult = queryResult.addOrderBy(orderBy, <any>order)
                    if (paginationParam.sort_by && paginationParam.sort_by == 2) {
                        queryResult = queryResult.addOrderBy("wb.atime", "ASC")
                    }
                    queryResult = await queryResult
                        .take(paginateObj.take)
                        .skip(paginateObj.skip)
                        .getManyAndCount();
                }
            } else {
                queryResult = await queryResult
                    .leftJoinAndMapOne(
                        'wb.company',
                        tableConstant.COMPANIES.TBL_COMPANY,
                        'company',
                        `company.id = wb.org_id AND company.status != 2`
                    )
                    .leftJoinAndMapOne(
                        'wb.category',
                        tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY,
                        'category',
                        `category.id = wb.cat_id AND category.status != 2`,
                    )
                    .where(condition)
                    .orderBy(orderBy, <any>order)
                    .take(paginateObj.take)
                    .skip(paginateObj.skip)
                    .getManyAndCount();
            }
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(result, total, paginateObj);
        }catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
    async findOne(condition: any, fields: any = ['*'],orderBy: any = 'id',order: any = 'DESC') {
        return await this.readReplicaWellbeingPostRepository.createQueryBuilder()
            .where(condition)
            .select(fields)
            .where(condition)
            .orderBy(orderBy, order)
            .getRawOne();
    }
    async listRecord(condition: any, fields: any = [],orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaWellbeingPostRepository.createQueryBuilder('ep')
            if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'ep.coach',
                    tableConstant.COACH.TBL_CO_COACHES,
                    'coach',
                    `ep.org_id = coach.org_id`,
                )
            }
            if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'coach.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = coach.org_id`,
                )
            }
        queryResult = queryResult.where(condition)
            .select(fields)
            .where(condition)
            .orderBy(`ep.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.addOrderBy(`company.company_name`, orderBy[Object.keys(orderBy)[0]]).groupBy('ep.id')
        }
        queryResult = await queryResult.getRawMany();
        return queryResult;
    }
    async campaginListRecord(condition: any, fields: any = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaWellbeingPostRepository.createQueryBuilder('ep')
        queryResult = queryResult.where(condition)
            .select(fields)
            .where(condition)
            .orderBy(`ep.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        queryResult = await queryResult.getRawMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingPostRepository.create(data);
        return await this.writeReplicaWellbeingPostRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaWellbeingPostRepository.metadata);
        return await this.writeReplicaWellbeingPostRepository.createQueryBuilder('wellbeing')
            .update(EmotionalWellBeingPostEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaWellbeingPostRepository.delete(condition);
    }
}