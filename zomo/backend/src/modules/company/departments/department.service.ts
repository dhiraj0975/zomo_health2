import { appConstant, CommonArrayService, CommonFileService, DepartmentsEntity, tableConstant, SortDirection } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(DepartmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
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
                ? paginationParam.order_by
                : 'department.id';
        const queryResult = await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
            .leftJoinAndMapOne(
                'department.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = department.company_id AND company.status = 1`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async campaignPaginate(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );

        const fields = paginationParam.fields || [];
        const order: SortDirection = paginationParam?.order ? paginationParam.order : 'DESC';
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
    async findOne(condition: string | object, fields: string[] = ['department']): Promise<DepartmentsEntity> {
        return await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
            .leftJoinAndMapOne(
                'department.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = department.company_id AND company.status = 1`,
            )
            .where(condition)
            .select(fields)
            .getOne()
    }
    async findOneDepartment(condition: FindOptionsWhere<DepartmentsEntity>, fields: FindOptionsSelect<DepartmentsEntity>): Promise<DepartmentsEntity> {
        return await this.readReplicaDepartmentsRepository.findOne({
            where: condition,
            select: fields,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any= ['id', 'code', 'dept_name', 'default_dept']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDepartmentsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaDepartmentsRepository.create(data);
        return await this.writeReplicaDepartmentsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDepartmentsRepository.metadata);
        return await this.writeReplicaDepartmentsRepository.createQueryBuilder('department')
            .update(DepartmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async filterData(condition: any) {
        return await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
            .where(condition)
            .getMany();
    }
    async userWiseDepartmentList(condition: any, fields: any) {
        return await this.readReplicaDepartmentsRepository.createQueryBuilder('department')
            .innerJoinAndMapOne(
                'department.user',
                tableConstant.TBL_USERS,
                'user',
                `user.department_id = department.id AND user.role_id IN(2,16) AND user.status = 1 AND user.org_id = department.company_id AND user.id IS NOT NULL`,
            )
            .where(condition)
            .select(fields)
            .groupBy('department.id')
            .getMany();
    }
    async getDepartmentWithChatCount(condition, user_id, paginationParam: any = null,) {
        try { 
            const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
            const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
            const query = await this.readReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .select('department.id')
            .where(condition)
            .orderBy(`department.${orderBy}`, <any>order);

            let total = await query.clone().getCount();
            const paginatedUserIds = await query
            .skip(paginateObj.skip)
            .take(paginateObj.take)
            .getRawMany()
            let ids = paginatedUserIds.map(u => u.department_id); 
            let department = await this.readReplicaDepartmentsRepository
                .createQueryBuilder('department')
                .leftJoin(
                (qb) => {
                    return qb
                    .select('COUNT(chat.id)', 'total')
                    .addSelect('chat.department_id','department_id')
                    .from(tableConstant.CHALLENGE.TBL_CH_CHAT, 'chat')
                    .where('chat.is_private = 0')
                    //   .andWhere(`chat.user_id = ${user_id}`)
                    .andWhere(`chat.read_by NOT REGEXP '^${user_id}'`)
                    .andWhere(`chat.read_by NOT REGEXP '${user_id}$'`)
                    .andWhere(`chat.read_by != ${user_id}`)
                    .andWhere(`chat.read_by NOT REGEXP '${user_id}'`)
                    .groupBy('chat.department_id');
                },
                'chatCount',
                'department.id = chatCount.department_id'
                )
                .whereInIds(ids)
                .select([
                'department.dept_name',
                'department.id',
                'COALESCE(chatCount.total, 0) AS total'
                ])
                .getRawMany();
            if(department && department.length){
                department = department.map((item) => {
                    const newItem = {};
                    Object.entries(item).forEach(([key, value]) => {
                      const newKey = key.startsWith('department_') ? key.replace('department_', '') : key;
                      newItem[newKey] = value;
                    });
                    return newItem;
                  });
            }
          return this.commonArrayService.paginationResponse(department, total, paginateObj);
        } catch (error) {
          console.error('Error fetching department:', error);
          return [];
        }
    }
}
