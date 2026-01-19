import { appConstant, CategoryEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationCategoryInput } from './input/paginationcategory.input';
@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(CategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCategoryRepository: Repository<CategoryEntity>,
        @InjectRepository(CategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCategoryRepository: Repository<CategoryEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(field : string[]=["category.*"],condition: any, paginationParam: PaginationCategoryInput) {
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
                : 'category.added_date';
        const queryResult = await this.readReplicaCategoryRepository.createQueryBuilder('category')
            .select(field)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCategoryRepository.metadata);
        return await this.writeReplicaCategoryRepository.createQueryBuilder('category')
            .update(CategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCategoryRepository.create(data);
        return await this.writeReplicaCategoryRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCategoryRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCategoryRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async getCategoryLinks(condition: any, orderBy: any = null, fields: any = ['category']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaCategoryRepository.createQueryBuilder('category')
        .where(condition).select(fields)
        .orderBy(`category.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await queryResult.getRawMany();
    }
    async delete(condition) {
        await this.writeReplicaCategoryRepository.delete(condition);
    }
}
