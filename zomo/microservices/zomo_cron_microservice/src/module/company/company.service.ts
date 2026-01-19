import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonService,
    CompaniesEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const path = require('path');
@Injectable()
export class CompanyService extends BaseService<CompaniesEntity> {
    constructor(
        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
        @InjectRepository(CompaniesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyRepository: Repository<CompaniesEntity>,
        @Inject('TIMEZONE_SERVICE')
        private timeZoneMicroservice: ClientProxy,
        commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
    ) {
        super(
            readReplicaCompanyRepository,
            writeReplicaCompanyRepository,
            'company',
            commonArrayService,
        );
    }
    async findOne(
        condition: any,
        joinTable: string[] = [],
        fields: any[] = [],
    ) {
        try {
            let query;
            if (joinTable && joinTable.length) {
                query =
                    this.readReplicaCompanyRepository.createQueryBuilder(
                        'company',
                    );
                if (
                    joinTable.includes(
                        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                    )
                ) {
                    query = query.leftJoinAndMapOne(
                        'company.companySetting',
                        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                        'companySetting',
                        `companySetting.org_id = company.id`,
                    );
                }
                if (
                    joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_META)
                ) {
                    query = query.leftJoinAndMapOne(
                        'company.companyMeta',
                        tableConstant.COMPANIES.TBL_COMPANY_META,
                        'companyMeta',
                        `companyMeta.org_id = company.id`,
                    );
                }
                if (
                    joinTable.includes(
                        tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                    )
                ) {
                    query = query.leftJoinAndMapOne(
                        'company.companyContract',
                        tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                        'companyContract',
                        `companyContract.org_id = company.id`,
                    );
                }
                if (joinTable.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS)) {
                    query = query
                    .leftJoinAndMapOne(
                    'company.assessment_settings',
                    tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS,
                    'assessment_settings',
                    `assessment_settings.organization_id = company.id`,
                    );
                }
                query = await query.select(fields).where(condition).getOne();
            } else {
                query = await this.readReplicaCompanyRepository
                    .createQueryBuilder('company')
                    .leftJoinAndMapOne(
                        'company.company_type',
                        tableConstant.COMPANIES.TBL_COMPANY_TYPE,
                        'company_type',
                        `company_type.id = company.companytype_id`,
                    )
                    .leftJoinAndMapMany(
                        'company.departments',
                        tableConstant.COMPANIES.TBL_DEPARTMENT,
                        'departments',
                        `departments.company_id = company.id AND departments.status = 1 AND departments.deleted = '0'`,
                    )
                    .leftJoinAndMapMany(
                        'company.locations',
                        tableConstant.COMPANIES.TBL_LOCATION,
                        'locations',
                        `locations.company_id = company.id AND locations.status = 1`,
                    )
                    .leftJoinAndMapOne(
                        'company.company_settings',
                        tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                        'company_settings',
                        `company_settings.org_id = company.id`,
                    )
                    .leftJoinAndMapOne(
                        'company.companyMeta',
                        tableConstant.COMPANIES.TBL_COMPANY_META,
                        'companyMeta',
                        `companyMeta.org_id = company.id`,
                    )
                    .select([
                        'company',
                        'departments.id',
                        'departments.dept_name',
                        'departments.default_dept',
                        'locations.id',
                        'locations.location_name',
                        'locations.lname',
                        'locations.is_default',
                        'company_type',
                        'company_settings.lock_username',
                        'company_settings.spouse_option',
                        'company_settings.census_status',
                        'company_settings.ssn',
                        'company_settings.is_reqd_ssn',
                        'companyMeta.id',
                        'companyMeta.emailattachment',
                        'companyMeta.custom_text',
                        'company_settings.pre_first_login_by',
                        'company_settings.first_login_by',
                    ])
                    .where(condition)
                    .getOne();
            }
            return query;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async companyFindOne(
        condition: any,
        fields: any[] = [],
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanyRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async companyListRecord(
        fields: any = ['id', 'code', 'company_name'],
        condition: any,
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanyRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCompanyRepository.create(data);
        return await this.writeReplicaCompanyRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaCompanyRepository
            .createQueryBuilder('company')
            .update(CompaniesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async getCompanyCodeFromId(id: number) {
        const getCode = await this.readReplicaCompanyRepository.findOne({
            where: { id },
            select: ['code'],
        });
        if (!getCode) {
            throw new Error('Company not found');
        }
        return getCode.code;
    }
    async getCompnayIdFromCode(companyCode: string) {
        const getCode = await this.readReplicaCompanyRepository.findOne({
            where: { code: companyCode },
            select: ['id'],
        });
        return getCode.id;
    }
    async getCompnayLogoOnIdCode(companyIdCode: any, type: string) {
        if (type === 'id') {
            const getCode = await this.readReplicaCompanyRepository.findOne({
                where: { id: companyIdCode },
                select: ['company_logo'],
            });
            return getCode.company_logo;
        } else {
            const getCode = await this.readReplicaCompanyRepository.findOne({
                where: { code: companyIdCode },
                select: ['company_logo'],
            });
            return getCode.company_logo;
        }
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = [
            'company.id',
            'company.code',
            'company.company_name',
            'companyMeta.id',
            'companyMeta.org_id',
            'companyMeta.zip_report_password',
        ],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaCompanyRepository
            .createQueryBuilder('company')
            .leftJoinAndMapOne(
                'company.companyMeta',
                tableConstant.COMPANIES.TBL_COMPANY_META,
                'companyMeta',
                `companyMeta.org_id = company.id`,
            );
        return await query
            .select(fields)
            .where(condition)
            .orderBy(
                `company.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async list(
        condition: any,
        orderBy: any = null,
        fields: any = [
            'company.id',
            'company.code',
            'company.company_name',
            'companySetting.is_emo_health_asssessments',
            'companySetting.id',
        ],
    ) {
        try {
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let query = this.readReplicaCompanyRepository
                .createQueryBuilder('company')
                .leftJoinAndMapOne(
                    'company.companySetting',
                    tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                    'companySetting',
                    `companySetting.org_id = company.id`,
                )
                .leftJoinAndMapOne(
                    'company.activeplugin',
                    tableConstant.COMPANIES.TBL_ACTIVE_PLUGINS,
                    'activeplugin',
                    `activeplugin.company_id  = company.id`,
                );
            if (fields.includes('assessmentSettings')) {
                query = query.leftJoinAndMapOne(
                    'company.assessmentSettings',
                    tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS,
                    'assessmentSettings',
                    `assessmentSettings.organization_id  = company.id`,
                );
            }
            return await query
                .select(fields)
                .where(condition)
                .orderBy(
                    `company.${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                )
                .getMany();
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async getCompanyZipPassword(cId) {
        try {
            let result = await this.findOne(
                `company.id = ${cId}`,
                ['c_company_meta'],
                [
                    'company.id',
                    'company.code',
                    'companyMeta.zip_report_password',
                ],
            );
            result = await this.commonService.mergeCompanyTables(result);
            if (
                result &&
                result.zip_report_password &&
                result.zip_report_password !== ''
            ) {
                return result.zip_report_password;
            } else {
                return `${result.code}_${result.id}`;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
