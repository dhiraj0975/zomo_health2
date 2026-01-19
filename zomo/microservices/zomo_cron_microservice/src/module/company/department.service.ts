import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    DepartmentsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from './input/paginateWithCompany.input';
@Injectable()
export class DepartmentService extends BaseService<DepartmentsEntity> {
    constructor(
        @InjectRepository(
            DepartmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {
        super(
            readReplicaDepartmentsRepository,
            writeReplicaDepartmentsRepository,
            'department',
            commonArrayService,
        );
    }
    async findOne(condition: any, fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .leftJoinAndMapOne(
                'department.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = department.company_id AND company.status = 1`,
            )
            .select(fields)
            .where(condition)
            .orderBy(
                `department.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDepartmentsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecordCustom(
        condition: any,
        fields: any[] = [],
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .select(fields)
            .where(condition)
            .orderBy(
                `department.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDepartmentsRepository.create(data);
        return await this.writeReplicaDepartmentsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .update(DepartmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    // async filterData(condition: any) {
    //     return await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
    //         .where(condition)
    //         .getMany();
    // }
    // async userWiseDepartmentList(condition: any, fields: any) {
    //     return await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
    //         .innerJoinAndMapOne(
    //             'department.user',
    //             tableConstant.TBL_USERS,
    //             'user',
    //             `user.department_id = department.id AND User.role_id IN(2,16) AND user.status = 1 AND user.id IS NOT NULL AND user.org_id = department.company_id`,
    //         )
    //         .where(condition)
    //         .select(fields)
    //         .groupBy('department.id')
    //         .getMany();
    // }

    async campaignPaginate(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );

        const fields = paginationParam.fields || [];
        const order = paginationParam?.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam?.order_by ? paginationParam.order_by : 'department.id';

        let queryBuilder = this.readReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .leftJoinAndMapOne(
                'department.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = department.company_id AND company.status = 1`
            )
            .leftJoin(tableConstant.TBL_USERS, 'user', 'user.department_id = department.id AND user.status = 1 AND user.role_id IN(2,16) AND user.org_id = department.company_id')
            .addSelect('COUNT(user.id)', 'userCount')
            .addSelect('GROUP_CONCAT(user.id)', 'userIds')
            .where(condition)
            .groupBy('department.id, company.id')
            .orderBy(orderBy, <any>order);

        if (fields && fields.length > 0) {
            queryBuilder.select(fields);
            queryBuilder.addSelect('COUNT(user.id)', 'userCount');
            queryBuilder.addSelect('GROUP_CONCAT(user.id)', 'userIds');
        }
        const totalRecords = await queryBuilder.getCount();
        queryBuilder.take(paginateObj.take).skip(paginateObj.skip);
        const rawData = await queryBuilder.getRawAndEntities();
        const result = rawData.entities.map((entity, index) => ({
            ...entity,
            userCount: parseInt(rawData.raw[index].userCount, 10) || 0,
            userIds: rawData.raw[index].userIds ? rawData.raw[index].userIds : '',
        }));
        return this.commonArrayService.paginationResponse(result, totalRecords, paginateObj);
    }
}
