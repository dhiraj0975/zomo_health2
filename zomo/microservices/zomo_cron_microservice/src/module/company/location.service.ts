import {
    appConstant,
    BaseService,
    CommonArrayService,
    LocationsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from './input/paginateWithCompany.input';
@Injectable()
export class LocationServices extends BaseService<LocationsEntity> {
    constructor(
        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaLocationsRepository,
            writeReplicaLocationsRepository,
            'locations',
            commonArrayService,
        );
    }
    async findOne(condition: any) {
        return await this.readReplicaLocationsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaLocationsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaLocationsRepository.create(data);
        return await this.writeReplicaLocationsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaLocationsRepository
            .createQueryBuilder('location')
            .update(LocationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async filterData(condition: any) {
        return await this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .where(condition)
            .getMany();
    }
    async userWiseLocationList(condition: any, fields: any) {
        return await this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .innerJoinAndMapOne(
                'location.user',
                tableConstant.TBL_USERS,
                'user',
                `user.location = location.id AND User.role_id IN(2,16) AND user.status = 1 AND user.id IS NOT NULL AND user.org_id = location.company_id`,
            )
            .where(condition)
            .select(fields)
            .groupBy('location.location_name')
            .getMany();
    }
    async campaignPaginate(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );

        const fields = paginationParam.fields || [];
        const order = paginationParam?.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam?.order_by ? paginationParam.order_by : 'location.id';

        let queryBuilder = this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .leftJoinAndMapOne(
                'location.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = location.company_id AND company.status = 1`
            )
            .leftJoin(tableConstant.TBL_USERS, 'user', 'user.location = location.id AND user.status = 1 AND user.role_id IN(2,16) AND user.org_id = location.company_id')
            .addSelect('COUNT(user.id)', 'userCount')
            .addSelect('GROUP_CONCAT(user.id)', 'userIds')
            .where(condition)
            .groupBy('location.id, company.id')
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
