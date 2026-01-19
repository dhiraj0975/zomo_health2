import {
    CommonService,
    CompaniesEntity,
    UserEntity,
    CronStatus,
    System_Type,
    ActivePluginsEntity,
    tableConstant,
    CommonDateService,
    appConstant,
    CommonFileService,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { CompanyService } from '../../company/company.service';
import { OrgCensusReportsService } from './orgcensusreports.service';
import { UserService } from '../../user/user.service';
import { CronCommonService } from '../../../common';
import { In } from 'typeorm';
import { ActivePluginService } from '../../company';
import { IncentiveReportHelperService } from '../../incentivereports/incentiveReportHelper.service';
import { CompanyNumberOfLiveReportsService } from '../../company/numberOfLiveReport.service';
import { lastValueFrom } from 'rxjs';
const path = require('path');

@Controller('org-census-report')
export class OrgCensusReportController {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly orgCensusReportsService: OrgCensusReportsService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly cronCommonService: CronCommonService,
        private readonly activePluginService: ActivePluginService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly incentiveReportHelperService: IncentiveReportHelperService,
        private readonly companyNumberOfLiveReportsService: CompanyNumberOfLiveReportsService,
    ) {}

    @MessagePattern({ cmd: 'org-census-report' })
    async orgCensusReport() {
        try {
            console.log('Org Census Report Cron Job Started');

            let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')+' 00:00:00';

            let companyDatas: CompaniesEntity[] = [];
            let filedArray = ['company.id','company.code','company.company_name','companyMeta.id','companyMeta.information','companyContract.id','companyContract.expense_description_amount','companyContract.package','companyContract.date_of_expense_submission','companyContract.billing_end_date','companyContract.billing_start_date','companyContract.contract_end_date','companyContract.contract_start_date','companyContract.engagement_manager_name','companyContract.billing_email','companyContract.billing_frequency', 'companyContract.billing_name', 'assignBroker', 'UserImportRequestRead.id', 'UserImportRequestRead.updated_date', 'campaign.id', 'campaign.organization_id' ];
            companyDatas = await this.companyService.commonQueryBuilder(
                        filedArray,
                        `company.status = 1 AND company.code != '' AND company.deleted = 0`,
                        { 'company.id': 'ASC', 'UserImportRequestRead.updated_date': 'DESC' },
                        [
                            {
                                join_table: 'company.companyMeta',
                                alias: 'companyMeta',
                                table: tableConstant.COMPANIES.TBL_COMPANY_META,
                                on_condition: `companyMeta.org_id = company.id`,
                                join_type: 'left_one',
                            },
                            {
                                join_table: 'company.companyContract',
                                alias: 'companyContract',
                                table: tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
                                on_condition: `companyContract.org_id = company.id`,
                                join_type: 'left_one',
                            },
                            {
                                join_table: 'company.assignBroker',
                                alias: 'assignBroker',
                                table: tableConstant.COMPANIES.TBL_ASSIGN_BROKERS,
                                on_condition: `assignBroker.company_id = company.id`,
                                join_type: 'left_many',
                            },
                            {
                                join_table: 'company.UserImportRequestRead',
                                alias: 'UserImportRequestRead',
                                table: tableConstant.TBL_IMPORT_USER_REQUEST,
                                on_condition: `UserImportRequestRead.org_id = company.id`,
                                join_type: 'left_one',
                            },
                            {
                                join_table: 'company.campaign',
                                alias: 'campaign',
                                table: tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                                on_condition: `campaign.organization_id = company.id AND campaign.start_date <= '${currentDate}' AND campaign.end_date >= '${currentDate}' AND campaign.status = 1`,
                                join_type: 'left_many',
                            },
                        ],
                        'getMany',
                    );
                    
                const OrgListBroker: Record<string, any> = {};
                const OrgUniqeList: Record<string, string> = {};
                const OrgListLen = companyDatas.length;
                if(companyDatas.length > 0){
                    for (let key = 0; key < OrgListLen; key++) {
                        const value = companyDatas[key];
                        const assignBroker = value['assignBroker'];
                        const campaign = value['campaign'];
                        if (assignBroker && assignBroker.length > 0) {
                            const brokerList = {};
                            for (let i = 0; i < assignBroker.length; i++) {
                                const userId = assignBroker[i].user_id;
                                brokerList[userId] = userId;
                                OrgListBroker[userId] = userId;
                            }
                            companyDatas[key]['assignBrokerList'] = brokerList;
                        }

                        if (campaign && campaign.length > 0) {
                            const campaignList = {};
                            for (let i = 0; i < campaign.length; i++) {
                                const id = campaign[i].id;
                                campaignList[id] = id;
                            }
                            companyDatas[key]['campaignList'] = campaignList;
                        }
                        OrgUniqeList[value.id] = value.code;
                    }
                }
                let brokerData = [];
                let brockerIds = {};
                let brockerIdsName = {};
                if(OrgListBroker && Object.keys(OrgListBroker).length > 0){
                    const brokerIds = Object.keys(OrgListBroker);
                    brokerData = await this.orgCensusReportsService.getBrokerDataByIds(brokerIds);
                    brockerIds = Object.fromEntries(
                        await Promise.all(
                            brokerData
                            .map(async users => [
                                users.id,
                                users.id
                            ])
                        )
                    );
                    brockerIdsName = Object.fromEntries(
                        await Promise.all(
                            brokerData
                            .map(async users => [
                                users.id,
                                users.full_name
                            ])
                        )
                    );
                }
                if(OrgUniqeList && Object.keys(OrgUniqeList).length > 0){
                    const orgCodes = Object.values(OrgUniqeList);
                    let OrgUserDatas = await this.orgCensusReportsService.getAllOrgUsers(orgCodes);
                    const OrgDataList = OrgUserDatas.reduce((acc, item) => {
                        acc[item.membership_code] = item;
                        return acc;
                    }, {});
                    let sheetDataArray = [];
                    let frequencys = ['','Annual', 'Quarterly', 'Monthly','Bi-Annual'];
                    let packageoptions = ['','Data Collection', 'Technology Support', 'Total Health', 'Tobacco Cessation Program', 'ad hoc'];
                    for (const companyData of companyDatas) {
                        let camStatus = 'No';
                        let cenStatus = '';
                        let brkNameSingle = '';
                        if(companyData['campaign'] && companyData['campaign'].length > 0){
                            camStatus = 'Yes';
                        }
                        if(companyData['UserImportRequestRead'] && companyData['UserImportRequestRead']['updated_date'] != ''){
                            cenStatus = await this.commonDateService.DateTimeFormat(companyData['UserImportRequestRead']['updated_date'], 'MM-DD-YYYY');
                        }
                        let billingFrequency = (companyData['companyContract'] && companyData['companyContract']['billing_frequency']) ? frequencys[companyData['companyContract']['billing_frequency']] : '';
                        let billingName = companyData['companyContract'] ? companyData['companyContract']['billing_name'] : '';
                        let billingEmail = companyData['companyContract'] ? companyData['companyContract']['billing_email'] : '';
                        let additionalInfo = companyData['companyMeta'] ? companyData['companyMeta']['information'] : '';

                        let engagementManagerName = (companyData['companyContract'] && companyData['companyContract']['engagement_manager_name'] != '') ? companyData['companyContract']['engagement_manager_name'] : '';
                        let choosePackage = (companyData['companyContract'] && companyData['companyContract']['package']) ? packageoptions[companyData['companyContract']['package']] : '';
                        let contractStartDate = (companyData['companyContract'] && companyData['companyContract']['contract_start_date'] != '' && companyData['companyContract']['contract_start_date'] != '0000-00-00' && companyData['companyContract']['contract_start_date'] != null) ? await this.commonDateService.DateTimeFormat(companyData['companyContract']['contract_start_date'], 'MM-DD-YYYY') : '';
                        let contractEndDate = (companyData['companyContract'] && companyData['companyContract']['contract_end_date'] != '' && companyData['companyContract']['contract_end_date'] != '0000-00-00' && companyData['companyContract']['contract_end_date'] != null) ? await this.commonDateService.DateTimeFormat(companyData['companyContract']['contract_end_date'], 'MM-DD-YYYY') : '';
                        let billingStartDate = (companyData['companyContract'] && companyData['companyContract']['billing_start_date'] != '' && companyData['companyContract']['billing_start_date'] != '0000-00-00' && companyData['companyContract']['billing_start_date'] != null) ? await this.commonDateService.DateTimeFormat(companyData['companyContract']['billing_start_date'], 'MM-DD-YYYY') : '';
                        let billingEndDate = (companyData['companyContract'] && companyData['companyContract']['billing_end_date'] != '' && companyData['companyContract']['billing_end_date'] != '0000-00-00' && companyData['companyContract']['billing_end_date'] != null) ? await this.commonDateService.DateTimeFormat(companyData['companyContract']['billing_end_date'], 'MM-DD-YYYY') : '';
                        let dateOfExpenseSubmission = (companyData['companyContract'] && companyData['companyContract']['date_of_expense_submission'] != '' && companyData['companyContract']['date_of_expense_submission'] != '0000-00-00' && companyData['companyContract']['date_of_expense_submission'] != null) ? await this.commonDateService.DateTimeFormat(companyData['companyContract']['date_of_expense_submission'], 'MM-DD-YYYY') : '';
                        let expenseDescriptionAmount = (companyData['companyContract'] && companyData['companyContract']['expense_description_amount'] != '') ? companyData['companyContract']['expense_description_amount'] : '';
                        if (companyData?.['assignBrokerList'] !== undefined && Object.keys(companyData['assignBrokerList']).length > 0) {
                            const intersection = Object.keys(brockerIds)
                                .filter(key => key in companyData['assignBrokerList'])
                                .reduce((obj, key) => {
                                    obj[key] = brockerIds[key];
                                    return obj;
                                }, {});
                            if (Object.keys(intersection).length > 0) {
                                brkNameSingle = Object.values(intersection).join(',');
                            } else {
                                brkNameSingle = '';
                            }
                        }

                        if(OrgDataList && OrgDataList[companyData.code]){
                            const orgActivityData = await this.orgCensusReportsService.getOrgActivityData(companyData.id, companyData.code, companyData['campaignList']);
                            sheetDataArray.push([companyData.company_name, brkNameSingle, billingName, contractStartDate, contractEndDate, billingEmail, billingFrequency, camStatus, orgActivityData, OrgDataList[companyData.code]['user_count'], OrgDataList[companyData.code]['spouse_count'], OrgDataList[companyData.code]['on_health_count'], OrgDataList[companyData.code]['off_health_count'], cenStatus, additionalInfo, engagementManagerName, choosePackage, billingStartDate, billingEndDate, dateOfExpenseSubmission, expenseDescriptionAmount]);
                        }else{
                            sheetDataArray.push([companyData.company_name, brkNameSingle, billingName, contractStartDate, contractEndDate, billingEmail, billingFrequency, camStatus, '0', '0', '0', '0', '0', cenStatus, additionalInfo, engagementManagerName, choosePackage, billingStartDate, billingEndDate, dateOfExpenseSubmission, expenseDescriptionAmount]);
                        }
                    }

                    let sheetHeader = structuredClone(appConstant.ORG_CENSUS_REPORT_HEADER);
                    let timeSheetName = await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYYHHmmss');
                    let J_filename = `Organization_Details${timeSheetName}.json`;
                    let F_filename = `Organization_Details${timeSheetName}.csv`;
                    const directory = path.join(appConstant.COMPANY_CENSUS_DETAILS_REPORT);
                    
                    J_filename = J_filename.replace(/[\s-]/g, '_');
                    F_filename = F_filename.replace(/[\s-]/g, '_');
                    let sheetDatas = await this.mapSheetData(sheetDataArray, sheetHeader);
                    let writeFile = await this.commonFileService.writeFile(path.join(`${directory}/`),`${JSON.stringify(sheetDatas)}`, J_filename);
                    if (writeFile?.status != 'success') {
                        throw new Error(`File does not exist`);
                    }
                    const file_full_path = path.resolve(
                        `${path.join(`${directory}/`)}${J_filename}`,
                    );
                    let csvFilePath = file_full_path.replace('.json', '.csv');
                    let excelData:any = await this.commonFileService.createJsonToFile(1,file_full_path,'pythonjsontocsv.py',);
                    if (excelData?.status == 'success') {
                        if (await this.commonFileService.fileExist(csvFilePath)) {
                            try {
                                let numberOfLiveReportsData = {
                                    status: 2,
                                    flage: 2,
                                    file: `${F_filename}`,
                                    report_date: await this.commonDateService.getTodayDate().format('YYYY-MM-DD'),
                                };
                                let insertRequest = await this.companyNumberOfLiveReportsService.save(numberOfLiveReportsData);
                                let uploadResult = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                        {
                                            path: path.resolve(`${csvFilePath}`),
                                            filename: `reports/censusreport/${insertRequest['id']}/${F_filename}`,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                if (!uploadResult) {
                                    this.cronCommonService.errorLog(
                                        0,
                                        'org-census-report',
                                        'Report Not Uploaded to Bucket',
                                        'Report Not Uploaded to Bucket',
                                    );
                                    return true;
                                }
                            } catch (err) {
                                this.cronCommonService.errorLog(
                                    0,
                                    'org-census-report',
                                    err?.message,
                                    err,
                                );
                                return true;
                            }
                        }
                    }
                    return true;
                }
        } catch (error) {
            console.log('Error in generateOrgCensusReport:', error);
            this.cronCommonService.errorLog(
                0,
                'org-census-report',
                error?.message,
                error,
            );
            return true;
        }
    }

    async mapSheetData(sheetData: any, headers) {
        try {
            return sheetData.map(row => {
                const obj: { [key: string]: any } = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
        } catch (error) {
            throw new Error(error);
        }
    }
}