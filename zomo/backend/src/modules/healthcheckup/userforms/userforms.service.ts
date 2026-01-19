import { appConstant, CommonArrayService, CommonFileService, tableConstant, UserFormsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserFormInterface } from 'src/interface/healthcheckup';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class UserFormsService {
    constructor(
        @InjectRepository(UserFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserFormsRepository: Repository<UserFormsEntity>,
        @InjectRepository(UserFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserFormsRepository: Repository<UserFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                ? `userForms.${paginationParam.order_by}`
                : 'userForms.added_date';
        let queryResult = await this.readReplicaUserFormsRepository.createQueryBuilder('userForms')
            .leftJoinAndMapOne(
                'userForms.Userformsattachments',
                tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS,
                'Userformsattachments',
                `Userformsattachments.user_form_id = userForms.id AND substring_index(Userformsattachments.name,".",-1) IN ('jpg', 'jpeg', 'png', 'pdf', 'heic', 'docx', 'doc')`,
            )
            .innerJoinAndMapOne(
                'userForms.user',
                tableConstant.TBL_USERS,
                'user',
                `userForms.user_id = user.id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaUserFormsRepository.create(data);
        return await this.writeReplicaUserFormsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaUserFormsRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserFormsRepository.metadata);
        return await this.writeReplicaUserFormsRepository.createQueryBuilder('userform')
            .update(UserFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserFormsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async dataManagerFindOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserFormsRepository.createQueryBuilder('userforms')
        .leftJoinAndMapOne(
            'userforms.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = userforms.user_id `,
        )
        .leftJoinAndMapOne(
            'userforms.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = user.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'userforms.formInstructions',
            tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,
            'formInstructions',
            `formInstructions.company_id = userforms.org_id`,
        )
        .where(condition)
        .orderBy('userforms.id', 'DESC')
        .getOne();
    }
    async listRecord(fields: any = ['userform.*'], condition: any, orderBy: any = null, joinTable: any = []): Promise<UserFormInterface[]> {
        if (!orderBy) {
            orderBy = { 'userform.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaUserFormsRepository.createQueryBuilder('userform')
        if (joinTable && joinTable.length > 0) {
            if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'userform.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = userform.org_id`
                )
            }
            if (joinTable.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'userform.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = userform.user_id`
                )
            }
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async dataManagerPaginateList(condition: string | object, paginationParam: PaginateWithCompanyInput, field: string[] = null,orderBy: object = null,tableData: string[] = []): Promise<{
      list: UserFormInterface[];
      total: number;
      pages: number;
      limit: number;
      page: number;
    }> {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult = this.readReplicaUserFormsRepository.createQueryBuilder('userforms')
            if (tableData.includes(tableConstant.TBL_USERS)) {
                queryResult = queryResult.innerJoinAndMapOne(
                    'userforms.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = userforms.user_id `,
                )
            }
            if (tableData.includes(tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'userforms.formInstructions',
                    tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS,
                    'formInstructions',
                    `formInstructions.company_id = userforms.org_id AND formInstructions.status !=2`,
                )
            }
            if( tableData.includes(tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'userforms.Userformsattachments',
                    tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS,
                    'Userformsattachments',
                    `Userformsattachments.user_form_id = userforms.id AND substring_index(Userformsattachments.name,".",-1) IN ('jpg', 'jpeg', 'png', 'pdf', 'heic', 'docx', 'doc')`,
                )
            }
            queryResult = await queryResult.where(condition);
            if(field !== null){
                queryResult.select(field);
            }
            queryResult.orderBy('userforms.status','ASC')
            .addOrderBy('userforms.updated_date','DESC')
            .groupBy('userforms.id')
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            let data=await queryResult.getManyAndCount();
        const [result, total] = data;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
