import { appConstant, CommonArrayService, CommonFileService, CompanyLanguagesEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class CompanyLanguagesService {
    constructor(
        @InjectRepository(CompanyLanguagesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicalanguageRepository: Repository<CompanyLanguagesEntity>,
        @InjectRepository(CompanyLanguagesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicalanguageRepository: Repository<CompanyLanguagesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput, req: Request = null) {
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
                : 'language.id';
        const queryResult = await this.readReplicalanguageRepository.createQueryBuilder('language')
        .leftJoinAndMapMany(
            'language.languages',
            tableConstant.TBL_LANGUAGES,
            'languages',
            `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0 AND languages.status = 1`,
          )
          .leftJoinAndMapOne(
            'language.active_plugin',
            tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
            'active_plugin',
            `active_plugin.company_id  = language.company_id AND active_plugin.plugin_name LIKE '%"Languagetext":1%'`,
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
        return await this.readReplicalanguageRepository.createQueryBuilder('language')
            .leftJoinAndMapMany(
                'language.languages',
                tableConstant.TBL_LANGUAGES,
                'languages',
                `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0 AND languages.status = 1`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicalanguageRepository.createQueryBuilder('language')
        .leftJoinAndMapMany(
            'language.languages',
            tableConstant.TBL_LANGUAGES,
            'languages',
            `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0 AND languages.status = 1`,
        )
        if (tableData.includes(tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS)) {
            query = query.leftJoinAndMapOne(
                'language.active_plugin',
                tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
                'active_plugin',
                `active_plugin.company_id = language.company_id AND active_plugin.plugin_name LIKE '%"Languagetext":1%'`,
            );
        }
            return await query.where(condition)
            .orderBy(`language.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicalanguageRepository.create(data);
        return await this.writeReplicalanguageRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicalanguageRepository.metadata);
        return await this.writeReplicalanguageRepository.createQueryBuilder('language')
            .update(CompanyLanguagesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicalanguageRepository.delete(condition);
    }
    async translateFindOne(condition: any) {
        return await this.readReplicalanguageRepository.createQueryBuilder('language')
        .leftJoinAndMapMany(
            'language.companySettings',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'companySettings',
            `language.company_id = companySettings.org_id`,
          )
            .where(condition)
            .select(['language.id', 'language.company_id', 'language.language_id'])
            .getOne();
    }
}