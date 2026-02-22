import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CompanySalesDto,
    CompanySalesEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CronCommonService } from 'src/common';
import { UserService } from 'src/module/user/user.service';
import { Repository } from 'typeorm';
@Injectable()
export class OrgSalesReportsService {
    constructor(
        @InjectRepository(CompanySalesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanySalesRepository: Repository<CompanySalesEntity>,
        private readonly cronCommonService: CronCommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly userService: UserService,   
    ) {}

    async listRecord(condition: any, orderBy: any = null, fields: any = ['companySales', 
        'company.id',
        'company.company_name',
        'company.street_address',
        'company.state',
        'company.city',
        'company.country',
        'company.zip',
        'company.created',
        'company_contract.industry',
        'company_contract.broker',
        'company_contract.package',
        ]) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanySalesRepository.createQueryBuilder('companySales')
        .leftJoinAndMapOne(
            'companySales.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = companySales.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'companySales.company_contract',
            tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
            'company_contract',
            `company_contract.org_id = companySales.org_id`,
        )
        .where(condition)
        .select(fields)
        .orderBy(`companySales.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }

    async orgSalesReport(postData: any) {
        try {
            let orgId = postData?.org_id ?? null;
            let where = orgId ? `company.id = ${orgId} AND companySales.status !=2` : `companySales.status !=2`;
            let resultedData = await this.listRecord(where);
            if(resultedData?.length == 0){
                return;
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySalesDto, resultedData)
            );
            let sheetData = [];
            let brokerList = appConstant.BROKER_LIST;
            let industryList = appConstant.ORG_INDUSTRY_LIST;
            let packageList = appConstant.ORG_PACKAGE_LIST;
            let rowData = [
                [
                    'Organization',
                    'Demo lead',
                    'Date of demo',
                    'Date client chose Zomo Health',
                    'Client industry',
                    'Approx. number of lives',
                    'Brokerage firm',
                    'Client package',
                    'Client location',
                    'Expected launch date',
                    // 'Demo recording',
                    'Demo notes',
                    'Did client choose Zomo Health',
                    'Retention',
                    'Why did the client leave Zomo Health',
                ]
            ];
            for(let org of resultedData){
                let userCount: any = await this.userService.list(`user.org_id = ${org?.['company']?.id} AND user.role_id in (2,16) AND user.status = 1`, null, ['user.id']);
                userCount = userCount?.length ?? 0;
                if(org?.['company_contract']?.broker){
                    org['company_contract']['broker'] = brokerList.find((broker) => broker.name == org?.['company_contract']?.broker) || '';
                }
                if(org?.['company_contract'].industry){
                    org['company_contract']['industry'] = industryList.find((industry) => industry.id == org?.['company_contract']?.industry) || '';
                }
                if(org?.['company_contract'].package){
                    org['company_contract']['package'] = packageList.find((element) => element.id == org?.['company_contract']?.package) || '';
                }
                let row = [];
                row.push(org?.['company']?.company_name ?? '');
                row.push(org?.demo_lead ?? '');
                row.push(org?.demo_date ? this.commonDateService.DateTimeFormat(org?.demo_date, 'MM-DD-YYYY') : '');
                row.push(org?.onboarding_date ? this.commonDateService.DateTimeFormat(org?.onboarding_date, 'MM-DD-YYYY') : '');
                row.push(org?.['company_contract']?.industry?.name ?? '');
                row.push(userCount ?? 0);
                row.push(org?.['company_contract']?.broker?.name ?? '');
                row.push(org?.['company_contract']?.package?.name ?? '');
                // row.push(org?.['company']?.city ? `${org}${org?.['company']?.city}, ${org?.['company']?.state}, ${org?.['company']?.country}` : '');
                row.push(org?.['company']?.street_address ? `${org?.['company']?.street_address}` : '');
                row.push(org?.launch_date ? this.commonDateService.DateTimeFormat(org?.launch_date, 'MM-DD-YYYY') : '');
                // row.push(org?.demo_recording ?? '');
                row.push(org?.demo_notes ?? '');
                row.push(org?.is_zomo_health_selected ? 'Yes' : 'No');
                row.push(org?.['company']?.retention ?? 0);
                row.push(org?.decline_reason ?? '');

                rowData.push(row);
            }
            sheetData.push({ sheet_name: "Sales Details", list: rowData })
            let ReportDetails = {
                prefix: `Orgs_Sales_Report_`,
                custom_cname: ``,
                path: `sales`
            };
            const manualReportResult = await this.cronCommonService.createReportXlSX(ReportDetails, sheetData);
            if (manualReportResult) {
                return manualReportResult;
            }
        } catch (error) {
            console.log('Error in generateOrgSalesReport:', error);
            this.cronCommonService.errorLog(
                0,
                'org-sales-report',
                error?.message,
                error,
            );
            return true;
        }
    }
}
