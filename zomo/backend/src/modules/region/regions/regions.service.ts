import { appConstant, CommonArrayService, CommonFileService, RegionEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateRegionInput } from "../../../input";
@Injectable()
export class RegionsService {
    constructor(
        @InjectRepository(RegionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaRegionStateCityRepository: Repository<RegionEntity>,
        @InjectRepository(RegionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaRegionStateCityRepository: Repository<RegionEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateRegionInput, field: any[] = null, joinTable: any[] = null) {
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
                : 'region.id';
        let queryResult: any = this.readReplicaRegionStateCityRepository.createQueryBuilder('region');
        if (joinTable && joinTable?.includes(tableConstant.TBL_USERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'region.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = region.regional_admin`,
            )
        }
        if(field && field.length > 0) {
            queryResult = queryResult.select(field);
        }
        queryResult = await queryResult.where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaRegionStateCityRepository.findOne({
            where: condition,
        });
    }
    // find one region with regional admin data
    async findOneWithR(condition: any) {
        return await this.readReplicaRegionStateCityRepository.createQueryBuilder('region')
        .leftJoinAndMapOne(
                'region.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = region.regional_admin`,
            )
            .where(condition)
            .getOne();
    }
    // // find all region with regional admin data
    // async findallWithR(condition: any,field:any []=['region']) {
    //     return await this.readReplicaRegionStateCityRepository.createQueryBuilder('region')
    //         .leftJoinAndMapOne(
    //             'region.user',
    //             tableConstant.TBL_USERS,
    //             'user',
    //             `user.id = region.regional_admin`,
    //         )
    //         .where(condition)
    //         .getMany();
    // }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaRegionStateCityRepository.find({
            where: condition,
            select: ['id','regional_admin','created_by','region_name'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaRegionStateCityRepository.create(data);
        return await this.writeReplicaRegionStateCityRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaRegionStateCityRepository.metadata);
        return await this.writeReplicaRegionStateCityRepository.createQueryBuilder('region')
            .update(RegionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaRegionStateCityRepository.delete(condition);
    }
}