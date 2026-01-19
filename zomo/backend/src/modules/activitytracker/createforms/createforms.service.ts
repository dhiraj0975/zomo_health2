import { appConstant, CommonArrayService, CommonFileService, CreateFormsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, UpdateResult } from 'typeorm';
import { PaginationCreateFormsInput } from './input';
@Injectable()
export class CreateFormsService {
    constructor(
        @InjectRepository(CreateFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCreateFormsRepository: Repository<CreateFormsEntity>,
        @InjectRepository(CreateFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCreateFormsRepository: Repository<CreateFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginationCreateFormsInput) {
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
                ? `cf.${paginationParam.order_by}`
                : 'cf.added_date';
        const queryResult = await this.readReplicaCreateFormsRepository.createQueryBuilder('cf')
        .leftJoinAndMapOne(
            'cf.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = cf.org_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: Partial<CreateFormsEntity>): Promise<CreateFormsEntity> {
        const savedResult = this.writeReplicaCreateFormsRepository.create(data);
        return await this.writeReplicaCreateFormsRepository.save(savedResult);
    }
    async findOne(condition: FindOptionsWhere<CreateFormsEntity> | string, orderBy: object = null): Promise<CreateFormsEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCreateFormsRepository.createQueryBuilder('cf')
        .leftJoinAndMapOne(
            'cf.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = cf.org_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(`cf.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async delete(condition: any) {
        await this.writeReplicaCreateFormsRepository.delete(condition);
    }
    async update(condition: FindOptionsWhere<CreateFormsEntity>, data: Partial<CreateFormsEntity>) :Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCreateFormsRepository.metadata);
        return await this.writeReplicaCreateFormsRepository.createQueryBuilder('cf')
            .update(CreateFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(fields: any,condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCreateFormsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
