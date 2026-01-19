import { Injectable } from '@nestjs/common';
import {
    DeepPartial,
    FindManyOptions, FindOneOptions,
    FindOptionsOrder,
    FindOptionsWhere,
    ObjectLiteral,
    Repository
} from 'typeorm';
import { PaginateDto } from "../dto";
import { dataType, FieldSelection, joinConditionInterface, OrderByOptions } from "../interface";
import { CommonArrayService } from "./commonarray.service";

@Injectable()
export abstract class BaseService<T extends ObjectLiteral> {
    protected constructor(
        private readonly readRepository: Repository<T>,
        private readonly writeRepository: Repository<T>,
        private readonly entityAlias: string,
        public readonly commonArrayService: CommonArrayService
    ) {}

    async create(createDto: DeepPartial<T>): Promise<T> {
        const entity = this.writeRepository.create(createDto);
        return this.writeRepository.save(entity as DeepPartial<T>);
    }
    async createMany(createDtos: DeepPartial<T>[]): Promise<T[]> {
        const entities = this.writeRepository.create(createDtos);
        return await this.writeRepository.save(entities);
    }
    async getOne(condition: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {},fields?: (keyof T)[], orderBy?: FindOptionsOrder<T>): Promise<T | null> {
        try {
            condition =  condition || {};
            const findOptions: FindOneOptions<T> = {
                ...(fields && fields.length > 0 && { select: fields }),
                where: condition,
                ...(orderBy && Object.keys(orderBy).length > 0 && { order: orderBy }),
            };
            return await this.readRepository.findOne(findOptions);
        } catch (error) {
            throw new Error(`Failed to fetch record ${error}`);
        }
    }
    async getAll(condition: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {},fields?: (keyof T)[], orderBy?: FindOptionsOrder<T>): Promise<T[]> {
        try {
            condition =  condition || {};
            const findOptions: FindManyOptions<T> = {
                ...(fields && fields.length && { select: fields }),
                where: condition,
                ...(orderBy && Object.keys(orderBy).length > 0 && { order: orderBy }),
            };
            return await this.readRepository.find(findOptions);
        } catch (error) {
            throw new Error(`Failed to fetch record ${error}`);
        }
    }

    async updateRecord(conditions: FindOptionsWhere<T>, updateDto: DeepPartial<T>): Promise<T | null> {
        const updateResult = await this.writeRepository.update(
            conditions,
            updateDto as any,
        );
        if (updateResult.affected === 0) {
            return null;
        }
        return this.getOne(conditions);
    }

    async paginate(paginationDto: PaginateDto, conditions: FindOptionsWhere<T> | FindOptionsWhere<T>[] | string = {}, relationsToJoin: string[] = []) {
        const { page, limit, order, orderBy } = paginationDto;
        const paginateObj = this.commonArrayService.getPaginationVar(page, limit);
        const queryBuilder = this.readRepository.createQueryBuilder(this.entityAlias);
        queryBuilder.where(conditions);
        relationsToJoin.forEach(relation => {
            const alias = relation.split('.').pop() ?? relation;
            queryBuilder.leftJoinAndSelect(relation, alias);
        });
        queryBuilder.orderBy(`${this.entityAlias}.${orderBy}`, order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
        const [result, total] = await queryBuilder.getManyAndCount();
        return this.commonArrayService.paginationResponse(
            result,
            total,
            paginateObj,
        );
    }

    async findOrCreate(conditions: FindOptionsWhere<T>, defaults: DeepPartial<T>): Promise<T> {
        let entity = await this.readRepository.findOneBy(conditions);
        if (!entity) {
            entity = this.writeRepository.create({ ...defaults, ...conditions });
            await this.writeRepository.save(entity as any);
        }
        return entity;
    }

    async upsert(conditions: FindOptionsWhere<T>, data: DeepPartial<T>): Promise<{ entity: T, isNew: boolean }> {
        let entity = await this.readRepository.findOneBy(conditions);
        let isNew = false;
        if (entity) {
            this.writeRepository.merge(entity, data);
        } else {
            entity = this.writeRepository.create({ ...data, ...conditions });
            isNew = true;
        }
        await this.writeRepository.save(entity as any);
        return { entity, isNew };
    }

    async checkExists(condition: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {}): Promise<boolean> {
        return this.readRepository.exist({
            where: condition
        });
    }

    async getCount(condition: FindOptionsWhere<T> | FindOptionsWhere<T>[] = {}): Promise<number> {
        return this.readRepository.count({
            where: condition
        });
    }

    /* TODO: add some common function [commonAggregateFunction,]*/

    async commonQueryBuilder(fields: FieldSelection<T> = [],condition: FindOptionsWhere<T> | FindOptionsWhere<T>[] | string = {}, orderBy: OrderByOptions, joinCondition: joinConditionInterface[],dataType: dataType = 'getOne',paginationDto: PaginateDto = {},GroupBy: string = '') {
        if (!orderBy) {
            orderBy = { [`${this.entityAlias}.id`] : 'DESC' };
        }
        let query: any = this.readRepository.createQueryBuilder(`${this.entityAlias}`)
        if(joinCondition && joinCondition?.length > 0){
            for(let i: number = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type }: joinConditionInterface = joinCondition[i];
                switch (join_type) {
                    case 'left_join':
                        query = query.leftJoin(table, alias, on_condition);
                        break;
                    case 'inner_join':
                        query = query.innerJoin(table, alias, on_condition);
                        break;
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
                    case 'inner_select':
                        query = query.innerJoinAndSelect(table, alias, on_condition);
                        break;
                    case 'left_select':
                        query = query.leftJoinAndSelect(table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition)
        if (fields?.length > 0) {
            query = query.select(fields)
        }
        const orderByKeys = Object.keys(orderBy);
        if (orderByKeys.length > 0) {
            query = query.orderBy(orderByKeys[0], orderBy[orderByKeys[0]]);
            for (let i: number = 1; i < orderByKeys.length; i++) {
                query = query.addOrderBy(orderByKeys[i], orderBy[orderByKeys[i]]);
            }
        }
        if (GroupBy != '') {
            query.groupBy(GroupBy)
        }
        const { page, limit } = paginationDto || {};
        if (page && limit) {
            const paginateObj = this.commonArrayService.getPaginationVar(page, limit);
            query.take(paginateObj.take).skip(paginateObj.skip);
        }
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
            case 'getManyAndCount':
                query = query.getManyAndCount();
                break;
            case 'getExists':
                query = query.getExists();
                break;
        }
        if (page && limit && dataType == 'getManyAndCount') {
            /* TODO: optimize paginateObj */
            const paginateObj = this.commonArrayService.getPaginationVar(page, limit);
            const [result, total] = await query;
            return this.commonArrayService.paginationResponse(
                result,
                total,
                paginateObj,
            );
        } else {
            return await query;
        }

    }
}