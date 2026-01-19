import { appConstant, CommonArrayService, CommonFileService, tableConstant, WellnessAssignmentEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyWellnessAssignmentInput } from "../../../input";
@Injectable()
export class WellnessAssignmentService {
    constructor(
        @InjectRepository(WellnessAssignmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicawellnessAssignmentRepository: Repository<WellnessAssignmentEntity>,
        @InjectRepository(WellnessAssignmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicawellnessAssignmentRepository: Repository<WellnessAssignmentEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyWellnessAssignmentInput) {
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
                : 'wellnessAssignment.id';
        const queryResult = await this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
            .leftJoinAndMapOne(
                'wellnessAssignment.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = wellnessAssignment.user_id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListAssignChampion(condition: any, paginationParam: PaginateWithCompanyWellnessAssignmentInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit || 10,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'user.id';
        const queryBuilder = this.readReplicawellnessAssignmentRepository
            .createQueryBuilder('wellnessAssignment')
            .leftJoinAndMapOne(
                'wellnessAssignment.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = wellnessAssignment.user_id`,
            )
            .leftJoinAndMapOne(
                'wellnessAssignment.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = wellnessAssignment.location`,
            )
            .leftJoinAndMapOne(
                'wellnessAssignment.Department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'Department',
                `Department.id = wellnessAssignment.department`,
            )

        const totalCount = await queryBuilder.select('COUNT(DISTINCT user.id) AS total')
            .where(condition)
            .getRawOne();
        let queryWithPagination = queryBuilder.select([
            'user.id AS user_id',
            'user.first_name AS first_name',
            'user.last_name AS last_name',
            'Location.id AS location_id',
            'Location.location_name AS location_name',
            'Department.id AS dept_id',
            'Department.dept_name AS dept_name',
            'CONCAT(user.first_name, " ", user.last_name) AS full_name',
            'MAX(wellnessAssignment.is_global) AS is_global',
            'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.state, "")) != "" THEN wellnessAssignment.state ELSE NULL END) AS states',
            'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.city, "")) != "" THEN wellnessAssignment.city ELSE NULL END) AS cities',
            'GROUP_CONCAT(DISTINCT CASE WHEN COALESCE(wellnessAssignment.department, "") != "0" AND TRIM(COALESCE(wellnessAssignment.department, "")) != "" THEN wellnessAssignment.department ELSE NULL END) AS departments',
            'GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.location, "")) != "0" AND TRIM(COALESCE(wellnessAssignment.location, "")) != "" THEN wellnessAssignment.location ELSE NULL END) AS locations',
            'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.state, "")) != "" THEN wellnessAssignment.state ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_state',
            'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.city, "")) != "" THEN wellnessAssignment.city ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_city',
            'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN COALESCE(wellnessAssignment.department, "") != "0" AND TRIM(COALESCE(wellnessAssignment.department, "")) != "" THEN wellnessAssignment.department ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_department',
            'CASE WHEN GROUP_CONCAT(DISTINCT CASE WHEN TRIM(COALESCE(wellnessAssignment.location, "")) != "0" AND TRIM(COALESCE(wellnessAssignment.location, "")) != "" THEN wellnessAssignment.location ELSE NULL END) IS NOT NULL THEN 1 ELSE 0 END AS is_location',
        ])
            .where(condition)
            .groupBy('user.id')
            .orderBy(orderBy, <any>order).getQuery();
        queryWithPagination += ` LIMIT ${paginateObj.take} OFFSET ${paginateObj.skip}`;

        let result = await this.readReplicawellnessAssignmentRepository.query(queryWithPagination);

        const total = totalCount ? parseInt(totalCount.total) : 0;
        result = result.filter(
            (item: any) =>
                item.user_id !== null && item.user_id !== undefined
        );
        const transformedResult = result.map((item) => ({
            user_id: item.user_id,
            user: {
                id: item.user_id,
                first_name: item.first_name,
                last_name: item.last_name,
                full_name: item.full_name,
            },
            is_global: parseInt(item.is_global) || 0,
            is_state: parseInt(item.is_state) || 0,
            is_city: parseInt(item.is_city) || 0,
            is_department: parseInt(item.is_department) || 0,
            is_location: parseInt(item.is_location) || 0,
            states: item.states ? item.states.split(',').filter((s: string) => s && s.trim() !== '') : [],
            cities: item.cities ? item.cities.split(',').filter((c: string) => c && c.trim() !== '') : [],
            departments: item.departments ? item.departments.split(',').filter((d: string) => d && d.trim() !== '' && d !== '0') : [],
            locations: item.locations ? item.locations.split(',').filter((l: string) => l && l.trim() !== '' && l !== '0') : [],
        }));

        return this.commonArrayService.paginationResponse(transformedResult, total, paginateObj);
    }
    async paginateListWithLocation(condition: any, paginationParam: PaginateWithCompanyWellnessAssignmentInput, type: string = null) {
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
                : 'wellnessAssignment.id';
        const queryResult = this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
            .innerJoinAndMapOne(
                'wellnessAssignment.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = wellnessAssignment.org_id AND company.status = 1`,
            );
        if (type == 'state') {
            queryResult.leftJoinAndMapOne(
                'wellnessAssignment.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.company_id = wellnessAssignment.org_id AND wellnessAssignment.state = Location.state`,
            )
        }
        else if (type == 'city') {
            queryResult.leftJoinAndMapOne(
                'wellnessAssignment.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.company_id = wellnessAssignment.org_id AND wellnessAssignment.city = Location.city`,
            )
        }
        else {
            queryResult.leftJoinAndMapOne(
                'wellnessAssignment.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.company_id = wellnessAssignment.org_id AND wellnessAssignment.location = Location.id`,
            );
        }
        let finalData = await queryResult.where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = finalData;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListWithDepartment(condition: any, paginationParam: PaginateWithCompanyWellnessAssignmentInput) {
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
                : 'wellnessAssignment.id';
        const queryResult = await this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
            .innerJoinAndMapOne(
                'wellnessAssignment.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = wellnessAssignment.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'wellnessAssignment.Department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'Department',
                `Department.company_id = wellnessAssignment.org_id AND wellnessAssignment.department = Department.id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateListWithOrganization(condition: any, paginationParam: PaginateWithCompanyWellnessAssignmentInput) {
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
                : 'wellnessAssignment.id';
        const queryResult = await this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
            .innerJoinAndMapOne(
                'wellnessAssignment.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = wellnessAssignment.org_id AND company.status = 1`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicawellnessAssignmentRepository.findOne({
            where: condition,
        });
    }
    async findOneWithComapny(condition: any) {
        return await this.readReplicawellnessAssignmentRepository
            .createQueryBuilder('wellnessAssignment')
            .leftJoinAndMapOne(
                'wellnessAssignment.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = wellnessAssignment.org_id AND company.status = 1`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, groupBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        if (groupBy == null) {
            let data: any = this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
                .leftJoinAndMapOne(
                    'wellnessAssignment.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = wellnessAssignment.user_id`,
                )
                .leftJoinAndMapOne(
                    'wellnessAssignment.Location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'Location',
                    `Location.id = wellnessAssignment.location`,
                )
                .leftJoinAndMapOne(
                    'wellnessAssignment.Department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'Department',
                    `Department.id = wellnessAssignment.department`,
                )
                .where(condition)
                .orderBy(`wellnessAssignment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            data = await data.getMany();
            return data;
        }
        else {
            let data: any = this.readReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
                .leftJoinAndMapOne(
                    'wellnessAssignment.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = wellnessAssignment.user_id`,
                )
                .where(condition)
                .orderBy(`wellnessAssignment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
                .groupBy(`wellnessAssignment.${Object.keys(groupBy)[0]}`);
            data = await data.getMany();
            return data;
        }
    }
    async save(data: any) {
        const savedResult = this.writeReplicawellnessAssignmentRepository.create(data);
        return await this.writeReplicawellnessAssignmentRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicawellnessAssignmentRepository.metadata);
        return await this.writeReplicawellnessAssignmentRepository.createQueryBuilder('wellnessAssignment')
            .update(WellnessAssignmentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicawellnessAssignmentRepository.delete(condition);
    }
}