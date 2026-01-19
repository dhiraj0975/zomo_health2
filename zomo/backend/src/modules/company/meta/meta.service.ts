import { appConstant, CommonArrayService, CommonFileService, CompanyMetaEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InsertResult, Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MetaService {
    constructor(
        @InjectRepository(CompanyMetaEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanyMetaRepository: Repository<CompanyMetaEntity>,
        @InjectRepository(CompanyMetaEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacompanyMetaRepository: Repository<CompanyMetaEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'companyMeta.org_id';
        let queryResult:any = this.readReplicacompanyMetaRepository.createQueryBuilder('companyMeta')
        .leftJoinAndMapOne(
            'companyMeta.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = companyMeta.org_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            queryResult = await queryResult.getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, select: any = []) {
            return await this.readReplicacompanyMetaRepository.findOne({
                where: condition,
                select: select,
            });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacompanyMetaRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any): Promise<CompanyMetaEntity[]> {
        data.a_popup_default_status = data?.a_popup_default_status ? data.a_popup_default_status : 0 ;
        if(data.a_popup_default_status == 1){
            let records = await this.listRecord({a_popup_default_status : 1});
            await Promise.all(records.map(async(element)=>{
                await this.update({ id: element.id },{ a_popup_title: data.a_popup_title, a_popup_text: data.a_popup_text })
            }));
        }
        else {
            const savedResult = this.writeReplicacompanyMetaRepository.create(data);
            return await this.writeReplicacompanyMetaRepository.save(savedResult);
        }
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacompanyMetaRepository.metadata);
        return await this.writeReplicacompanyMetaRepository.createQueryBuilder('companyMeta')
            .update(CompanyMetaEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacompanyMetaRepository.delete(condition);
    }
}