import { appConstant, CommonArrayService, CommonFileService, CovidVaccinationTypeEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidInput } from "../../../input";
@Injectable()
export class VaccinationTypeService {
    constructor(
        @InjectRepository(CovidVaccinationTypeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicavaccinationTypeRepository: Repository<CovidVaccinationTypeEntity>,
        @InjectRepository(CovidVaccinationTypeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicavaccinationTypeRepository: Repository<CovidVaccinationTypeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCovidInput) {
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
                : 'vaccinationType.id';
        let query = await this.readReplicavaccinationTypeRepository.createQueryBuilder('vaccinationType')
        .leftJoinAndMapOne(
            'vaccinationType.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = vaccinationType.org_id AND company.status = 1`,
          )
            .where(condition);
        let result;
        let total;
        if(!condition.includes('org_id') || paginationParam?.filter_by?.toLowerCase() == 'organization' || condition.includes('company.id IS NOT NULL')){
            query = query.groupBy('vaccinationType.org_id');
            let queryResult = await query
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
            [result, total] = queryResult;
            let count = await query.orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip).getRawMany();
            total = count.length;
        } else{
            let queryResult = await query
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
            [result, total] = queryResult;
        }
        
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicavaccinationTypeRepository.createQueryBuilder('vaccinationType')
        .leftJoinAndMapOne(
            'vaccinationType.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = vaccinationType.org_id AND company.status = 1`,
          )
        .where(condition)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicavaccinationTypeRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicavaccinationTypeRepository.create(data);
        return await this.writeReplicavaccinationTypeRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicavaccinationTypeRepository.metadata);
        return await this.writeReplicavaccinationTypeRepository.createQueryBuilder('vaccinationType')
            .update(CovidVaccinationTypeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicavaccinationTypeRepository.delete(condition);
    }
}