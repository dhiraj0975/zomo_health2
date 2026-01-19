import { SubmitFormInterface } from '@/interface/activitytracker';
import { appConstant, CommonArrayService, CommonFileService, SubmitedFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput, PaginationSubmitFormInput } from "../../../input";
@Injectable()
export class SubmitFormsService {
    constructor(
        @InjectRepository(SubmitedFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSubmitedFormsRepository: Repository<SubmitedFormsEntity>,
        @InjectRepository(SubmitedFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSubmitedFormsRepository: Repository<SubmitedFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async paginateList(condition: any, paginationParam: PaginationSubmitFormInput)
    {
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
                ? `sf.${paginationParam.order_by}`
                : 'sf.added_date';
        let queryResult: any;
        if (paginationParam && paginationParam.role_id == 3) {
            queryResult = await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
                .innerJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `sf.activity_id = activity.id`,
                )
                .innerJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS,
                    'createForm',
                    `sf.form_id = createForm.id`,
                )
                .innerJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `sf.org_id = company.id AND company.status = 1`,
                )
                .innerJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `sf.user_id = user.id`,
                )
                .where(condition)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
        } else {
            queryResult = await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
                .innerJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `sf.activity_id = activity.id`,
                )
                .innerJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS,
                    'createForm',
                    `sf.form_id = createForm.id`,
                )
                .innerJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `sf.org_id = company.id AND company.status = 1`,
                )
                .innerJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `sf.user_id = user.id AND user.status = 1`,
                )
                .where(condition)              
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
        }
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSubmitedFormsRepository.create(data);
        return await this.writeReplicaSubmitedFormsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaSubmitedFormsRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSubmitedFormsRepository.metadata);
        return await this.writeReplicaSubmitedFormsRepository.createQueryBuilder('sf')
            .update(SubmitedFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
            .innerJoinAndMapOne(
                'sf.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `sf.activity_id = activity.id`,
            )
            .innerJoinAndMapOne(
                'sf.createForm',
                tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS,
                'createForm',
                `sf.form_id = createForm.id`,
            )
            .innerJoinAndMapOne(
                'sf.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `sf.org_id = company.id AND company.status = 1`,
            )
            .innerJoinAndMapOne(
                'sf.user',
                tableConstant.TBL_USERS,
                'user',
                `sf.user_id = user.id`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(fields: any = ['sf.*'], condition: any, orderBy: any = null, joinTable: any = []): Promise<SubmitFormInterface[]> {
        if (!orderBy) {
            orderBy = { 'sf.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
        if (joinTable && joinTable.length > 0) {
            if (joinTable.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `activity.id = sf.activity_id`
                )
            }
            if (joinTable.includes(tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.createForm',
                    tableConstant.ACTIVITY_TRACKER.TBL_CREATE_FORMS,
                    'createForm',
                    `createForm.id = sf.form_id`
                )
            }
            if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = sf.org_id`
                )
            }
            if (joinTable.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'sf.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = sf.user_id`
                )
            }
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async listRecordPaginate(condition: string | object, paginationParam: PaginateWithCompanyInput, field: string[] = null, joinTable: any = []): Promise<{
          list: SubmitFormInterface[];
          total: number;
          pages: number;
          limit: number;
          page: number;
    }> 
    {
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
                ? `sf.${paginationParam.order_by}`
                : 'sf.added_date';
        let queryResult = this.readReplicaSubmitedFormsRepository.createQueryBuilder('sf')
        if(joinTable && joinTable.length > 0){
            for(let i = 0; i < joinTable.length; i++){
                if(joinTable[i].type == 'INNER'){
                    queryResult = queryResult.innerJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
                else if(joinTable[i].type == 'INNERMANY'){
                    queryResult = queryResult.innerJoinAndMapMany(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
                else if(joinTable[i].type == 'LEFTMANY'){
                    queryResult = queryResult.leftJoinAndMapMany(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
                else{
                    queryResult = queryResult.leftJoinAndMapOne(
                        `${joinTable[i].connect}.${joinTable[i].alias}`,
                        joinTable[i].table,
                        joinTable[i].alias,
                        joinTable[i].on,
                    );
                }
            }
        }
        queryResult = await queryResult.where(condition);
        if(field !== null){
            queryResult.select(field);
        }
        queryResult
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip);
        let data = await queryResult.getManyAndCount();
        const [result, total] = data;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
