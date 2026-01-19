import {
    appConstant, CompaniesEntity, DepartmentsEntity, LocationsEntity,
    MediaCategoryEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(MediaCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly readReplicamediaCategoryRepository: Repository<MediaCategoryEntity>,
        @InjectRepository(CompaniesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        @InjectRepository(LocationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
    ) {}
    async mediaCategoryClicksExists(condition: any) {
        return this.readReplicamediaCategoryRepository.exist({
            where: condition
        });
    }
    async companyData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'company.id' : 'DESC' };
        }
        let query: any = this.readReplicaCompanyRepository.createQueryBuilder('company')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
    async departmentData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'department.id' : 'DESC' };
        }
        let query: any = this.readReplicaDepartmentsRepository.createQueryBuilder('department')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
    async locationData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'location.id' : 'DESC' };
        }
        let query: any = this.readReplicaLocationsRepository.createQueryBuilder('location')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
}
