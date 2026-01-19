import {
    appConstant,
    BaseService,
    CommonArrayService,
    CompanyLanguagesEntity,
    tableConstant,
} from '@common-constants';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CompanyLanguagesService extends BaseService<CompanyLanguagesEntity> {
    constructor(
        @InjectRepository(
            CompanyLanguagesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicalanguageRepository: Repository<CompanyLanguagesEntity>,
        @InjectRepository(
            CompanyLanguagesEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicalanguageRepository: Repository<CompanyLanguagesEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicalanguageRepository,
            writeReplicalanguageRepository,
            'language',
            commonArrayService,
        );
    }
    async findAllWithInternationalization(
        conditions: any[] = [],
    ): Promise<
        Array<{ CompanyLanguage: { company_id: number; language_id: string } }>
    > {
        try {
            const queryBuilder = this.readReplicalanguageRepository
                .createQueryBuilder('CompanyLanguage')
                .leftJoin(
                    'c_company_settings',
                    'CompanySettings',
                    'CompanyLanguage.company_id = CompanySettings.org_id',
                )
                .where('CompanySettings.is_internationalization = :status', {
                    status: '1',
                });
            if (conditions.length > 0) {
                conditions.forEach((condition, index) => {
                    const key = Object.keys(condition)[0];
                    const value = condition[key];
                    queryBuilder.andWhere(`${key} = :value${index}`, {
                        [`value${index}`]: value,
                    });
                });
            }
            const results = await queryBuilder
                .select([
                    'CompanyLanguage.company_id',
                    'CompanyLanguage.language_id',
                ])
                .getMany();

            return results.map((result) => ({
                CompanyLanguage: {
                    company_id: result.company_id,
                    language_id: result.language_id,
                },
            }));

            Logger.warn(
                'Using placeholder data - implement actual database query',
            );
            return [];
        } catch (error) {
            Logger.error(`Error finding company languages: ${error.message}`);
            throw error;
        }
    }
    async findOne(condition: any) {
        return await this.readReplicalanguageRepository
            .createQueryBuilder('language')
            .leftJoinAndMapMany(
                'language.languages',
                tableConstant.TBL_LANGUAGES,
                'languages',
                `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        tableData: any[] = [],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicalanguageRepository
            .createQueryBuilder('language')
            .leftJoinAndMapMany(
                'language.languages',
                tableConstant.TBL_LANGUAGES,
                'languages',
                `FIND_IN_SET(languages.id, REPLACE(language.language_id, ' ', '')) > 0`,
            );
        if (tableData.includes(tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS)) {
            query = query.leftJoinAndMapOne(
                'language.active_plugin',
                tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
                'active_plugin',
                `active_plugin.company_id = language.company_id AND active_plugin.plugin_name LIKE '%"Languagetext":1%'`,
            );
        }
        return await query
            .where(condition)
            .orderBy(
                `language.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicalanguageRepository.create(data);
        return await this.writeReplicalanguageRepository.insert(savedResult);
    }

    async delete(condition: any) {
        await this.writeReplicalanguageRepository.delete(condition);
    }
    async translateFindOne(condition: any) {
        return await this.readReplicalanguageRepository
            .createQueryBuilder('language')
            .leftJoinAndMapMany(
                'language.companySettings',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companySettings',
                `language.company_id = companySettings.org_id`,
            )
            .where(condition)
            .select([
                'language.id',
                'language.company_id',
                'language.language_id',
            ])
            .getOne();
    }
}
