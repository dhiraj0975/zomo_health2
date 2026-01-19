import { appConstant, CommonArrayService, CommonFileService, LocationsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class LocationService {
    constructor(
        @InjectRepository(LocationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
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
                : 'location.id';
        const queryResult = await this.readReplicaLocationsRepository.createQueryBuilder('location')
            .leftJoinAndMapOne(
                'location.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = location.company_id AND company.status = 1`,
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
    
    async findOne(condition: string | object, fields: string[] = ['location']): Promise<LocationsEntity> {
        return await this.readReplicaLocationsRepository.createQueryBuilder('location')
            .where(condition)
            .select(fields)
            .getOne();
    }
    async findOneUserLocation(condition: FindOptionsWhere<LocationsEntity>, field: FindOptionsSelect<LocationsEntity>) {
            return await this.readReplicaLocationsRepository.findOne({
                where: condition,
                select: field
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
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaLocationsRepository.metadata);
        return await this.writeReplicaLocationsRepository.createQueryBuilder('location')
            .update(LocationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async filterData(condition: any) {
        return await this.readReplicaLocationsRepository.createQueryBuilder('location')
            .where(condition)
            .getMany();
    }
    async userWiseLocationList(condition: any, fields: any) {
        return await this.readReplicaLocationsRepository.createQueryBuilder('location')
            .innerJoinAndMapOne(
                'location.user',
                tableConstant.TBL_USERS,
                'user',
                `user.location = location.id AND user.role_id IN(2,16) AND user.status = 1 AND user.org_id = location.company_id AND user.id IS NOT NULL`,
            )
            .where(condition)
            .select(fields)
            .groupBy('location.id')
            .getMany();
    }
    async getLocationWithChatCount(condition, user_id, paginationParam: any = null,) {
        try {  
            const paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
            const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
            const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'id';
            const query = await this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .select('location.id')
            .where(condition)
            .orderBy(`location.${orderBy}`, <any>order);

            let total = await query.clone().getCount();
            const paginatedUserIds = await query
            .skip(paginateObj.skip)
            .take(paginateObj.take)
            .getRawMany()
            let ids = paginatedUserIds.map(u => u.location_id);
            let location = await this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .leftJoin(
                (qb) => {
                return qb
                    .select('COUNT(chat.id)', 'total')
                    .addSelect('chat.location_id', 'location_id') 
                    .from(tableConstant.CHALLENGE.TBL_CH_CHAT, 'chat')
                    .where('chat.is_private = 0')
                    // .andWhere(`chat.user_id = '${user_id}'`)
                    .andWhere(`chat.read_by NOT REGEXP '^${user_id}'`)
                    .andWhere(`chat.read_by NOT REGEXP '${user_id}$'`)
                    .andWhere(`chat.read_by != '${user_id}'`)
                    .andWhere(`chat.read_by NOT REGEXP '${user_id}'`)
                    .groupBy('chat.location_id');
                },
                'chatCount',
                'location.id = chatCount.location_id'
            )
            .whereInIds(ids)
            .select([
                'location.location_name',
                'location.id',
                'COALESCE(chatCount.total, 0) AS total'
            ]).getRawMany();
            if(location && location.length){
                location = location.map((item) => {
                    const newItem = {};
                    Object.entries(item).forEach(([key, value]) => {
                      const newKey = key.startsWith('location_') ? key.replace('location_', '') : key;
                      newItem[newKey] = value;
                    });
                    return newItem;
                  });
            }
          return this.commonArrayService.paginationResponse(location, total, paginateObj);
        } catch (error) {
          console.error('Error fetching locations:', error);
          return [];
        }
    }
}
