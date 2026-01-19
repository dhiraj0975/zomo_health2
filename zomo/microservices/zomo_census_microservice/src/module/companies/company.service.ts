import { appConstant, tableConstant, CompaniesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyService {
    constructor(
        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
    ) {}
    async findOne(
        condition: any,
        joinTable: string[] = [],
        fields: any[] = [],
    ) {
        let query;
        if (joinTable && joinTable.length) {
            query =
                this.readReplicaCompanyRepository.createQueryBuilder('company');
            if (
                joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_SETTINGS)
            ) {
                query = query.leftJoinAndMapOne(
                    'company.companySetting',
                    tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                    'companySetting',
                    `companySetting.org_id = company.id`,
                );
            }
            if (joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_META)) {
                query = query.leftJoinAndMapOne(
                    'company.companyMeta',
                    tableConstant.COMPANIES.TBL_COMPANY_META,
                    'companyMeta',
                    `companyMeta.org_id = company.id`,
                );
            }
            if (
                joinTable.includes(tableConstant.COMPANIES.TBL_COMPANY_CONTRACT)
            ) {
                query = query.leftJoinAndMapOne(
                    'company.companyContract',
                    tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                    'companyContract',
                    `companyContract.org_id = company.id`,
                );
            }
            if (
                joinTable.includes(
                    tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
                )
            ) {
                query = query.leftJoinAndMapOne(
                    'company.membership_plan',
                    tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
                    'membership_plan',
                    `membership_plan.id = company.membership_plan_id`,
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
                    `departments.company_id = company.id AND departments.status = 1 AND departments.deleted = 0`,
                )
                .leftJoinAndMapMany(
                    'company.locations',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'locations',
                    `locations.company_id = company.id AND locations.status = 1 AND locations.deleted = 0`,
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
                .leftJoinAndMapOne(
                    'company.membership_plan',
                    tableConstant.COMPANIES.TBL_C_MEMBERSHIP_PLAN,
                    'membership_plan',
                    `membership_plan.id = company.membership_plan_id`,
                )
                .select([
                    'company',
                    'departments.id',
                    'departments.dept_name',
                    'departments.default_dept',
                    'locations.id',
                    'locations.location_name',
                    'locations.is_default',
                    'company_type',
                    'company_settings.lock_username',
                    'company_settings.first_login_by',
                    'company_settings.pre_first_login_by',
                    'companyMeta.id',
                    'companyMeta.emailattachment',
                    'companyMeta.custom_text',
                    'membership_plan.id',
                    'membership_plan.name',
                ])
                .where(condition)
                .getOne();
        }
        return query;
    }
}
