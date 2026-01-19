import { appConstant, CommonArrayService, CommonFileService, CompanyTypesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { CreateCompanyTypesInput, PaginateInput, UpdateCompanyTypesInput } from "../../../input";
@Injectable()
export class CompanyTypesService {
    constructor(
      @InjectRepository(CompanyTypesEntity, appConstant.READ_REPLICA.toLowerCase())
      private readonly readReplicaCompanyTypesRepository: Repository<CompanyTypesEntity>,
      @InjectRepository(CompanyTypesEntity, appConstant.MAIN.toLowerCase())
      private readonly writeReplicaCompanyTypesRepository: Repository<CompanyTypesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
            : 'id';
        const queryResult = await this.readReplicaCompanyTypesRepository.createQueryBuilder(
          'companytypes',
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
        return await this.readReplicaCompanyTypesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaCompanyTypesRepository.find({
            where: condition,
            select: ['id', 'company_type'],
            order: orderBy,
        });
    }
    async save(data: CreateCompanyTypesInput) {
        const savedResult = this.writeReplicaCompanyTypesRepository.create(data);
        return await this.writeReplicaCompanyTypesRepository.save(savedResult);
    }
    async update(condition: any, data: UpdateCompanyTypesInput) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCompanyTypesRepository.metadata);
        return await this.writeReplicaCompanyTypesRepository.createQueryBuilder('companytypes')
            .update(CompanyTypesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
