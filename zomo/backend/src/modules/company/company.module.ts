import {
    ActivePluginsEntity, appConstant, AssignBrokerEntity,
    AssignEngagementManagerEntity,
    cCompanySupport,
    CensusCustomFieldsEntity,
    CensusCustomFieldsValuesEntity,
    CensusFrequencyEntity,
    ClientManagerAssignEntity,
    CompaniesEntity,
    CompanyCEMInfoEntity,
    CompanyContractEntity,
    CompanyDashboardClickEntity,
    CompanyDashboardEntity,
    CompanyLanguagesEntity,
    CompanyMasscommunicationEntity,
    CompanyMetaEntity,
    CompanyNumberOfLiveReportsEntity,
    CompanyReportMenuSettingsEntity,
    CompanySalesEntity,
    CompanySettingsEntity,
    CompanySideMenuSettingsEntity, CompanySupportsEntity,
    CompanyTypesEntity,
    DepartmentsEntity,
    GlobalAccessEntity,
    InterlinksEntity,
    KeyContactsEntity,
    LocationsEntity,
    MediaCategoryEntity,
    MembershipPlanEntity,
    OrgCensusReportEntity,
    PhysicianTempsEntity,
    WellnessAssignmentEntity,
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivePluginController } from './activeplugins/activeplugin.controller';
import { ActivePluginService } from './activeplugins/activeplugin.service';
import { AssignBrokerController } from './assignbroker/assignBroker.controller';
import { AssignBrokerService } from './assignbroker/assignBroker.service';
import { AssignEngagementMangerController } from './assignengagementmanger/assignEngagementManger.controller';
import { AssignEngagementMangerService } from './assignengagementmanger/assignEngagementManger.service';
import { CCompanySupportController } from './cCompanySupport/ccompanysupport.controller';
import { CCompanySupportService } from './cCompanySupport/ccompanysupport.service';
import { CEMInfoController } from './ceminfo/ceminfo.controller';
import { CEMInfoService } from './ceminfo/ceminfo.service';
import { CensusCustomFieldsController } from "./censuscustomfields/censuscustomfields.controller";
import { CensusCustomFieldsService } from "./censuscustomfields/censuscustomfields.service";
import { CensusCustomFieldsValuesController } from "./censuscustomfieldsvalues/censuscustomfieldsvalues.controller";
import { CensusCustomFieldsValuesService } from "./censuscustomfieldsvalues/censuscustomfieldsvalues.service";
import { CensusFrequencyController } from "./censusfrequency/censusfrequency.controller";
import { CensusFrequencyService } from "./censusfrequency/censusfrequency.service";
import { ClientManagerAssignController } from './clientmanagerassign/clientmanagerassign.controller';
import { ClientManagerAssignService } from './clientmanagerassign/clientmanagerassign.service';
import { CompanyController } from './companies/company.controller';
import { CompanyService } from './companies/company.service';
import { CompanyTypesController } from './companytypes/companytypes.controller';
import { CompanyTypesService } from './companytypes/companytypes.service';
import { ContractController } from './contract/contract.controller';
import { ContractService } from './contract/contract.service';
import { DashboardClickService } from './dashboard/dashboard-click.service';
import { dashboardsController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DepartmentController } from './departments/department.controller';
import { DepartmentService } from './departments/department.service';
import { FrontService } from "./front/front.service";
import { GlobalAccessController } from "./globalaccess/globalaccess.controller";
import { GlobalAccessService } from "./globalaccess/globalaccess.service";
import { InterlinksController } from './interlinks/interlinks.controller';
import { InterlinksService } from './interlinks/interlinks.service';
import { KeyContactController } from './keycontacts/keycontact.controller';
import { KeyContactService } from './keycontacts/keycontact.service';
import { LanguagesController } from "./languages/languages.controller";
import { CompanyLanguagesService } from "./languages/languages.service";
import { LocationController } from './locations/location.controller';
import { LocationService } from './locations/location.service';
import { MassCommnicationController } from './masscommunication/masscommunication.controller';
import { MassCommunicationService } from './masscommunication/masscommunication.service';
import { MembershipPlanController } from './membershipplan/membershipplan.controller';
import { MembershipPlanService } from './membershipplan/membershipplan.service';
import { MetaController } from './meta/meta.controller';
import { MetaService } from './meta/meta.service';
import { CompanyNumberOfLiveReportController } from './numberoflivereport/numberOfLiveReport.controller';
import { CompanyNumberOfLiveReportsService } from './numberoflivereport/numberOfLiveReport.service';
import { OrgCensusReportController } from './orgcensusreport/orgcensusreport.controller';
import { OrgCensusReportService } from './orgcensusreport/orgcensusreport.service';
import { PhysicianTempController } from './physiciantemp/physiciantemp.controller';
import { PhysicianTempService } from './physiciantemp/physiciantemp.service';
import { ReportMenuSettingsController } from './reportmenusettings/reportMenuSettings.controller';
import { ReportMenuSettingsService } from './reportmenusettings/reportMenuSettings.service';
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { SideMenuSettingsController } from './sidemenusettings/sideMenuSettings.controller';
import { SideMenuSettingsService } from './sidemenusettings/sideMenuSettings.service';
import { SupportController } from "./support/support.controller";
import { SupportService } from "./support/support.service";
import { WellnessAssignmentController } from "./wellnessassignment/wellnessAssignment.controller";
import { WellnessAssignmentService } from "./wellnessassignment/wellnessAssignment.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([CompanyTypesEntity, CompaniesEntity, CompanyDashboardClickEntity, DepartmentsEntity, LocationsEntity, KeyContactsEntity, ActivePluginsEntity, AssignBrokerEntity, CensusCustomFieldsEntity, CensusCustomFieldsValuesEntity,
            CensusFrequencyEntity, CompanyDashboardEntity, InterlinksEntity, PhysicianTempsEntity, CompanyContractEntity, CompanyMetaEntity, CompanySettingsEntity, CompanyReportMenuSettingsEntity,
            CompanySideMenuSettingsEntity, CompanySupportsEntity, WellnessAssignmentEntity, CompanyLanguagesEntity, AssignEngagementManagerEntity, GlobalAccessEntity, ClientManagerAssignEntity, cCompanySupport, MembershipPlanEntity, MediaCategoryEntity,CompanyMasscommunicationEntity,CompanyCEMInfoEntity,CompanyNumberOfLiveReportsEntity,OrgCensusReportEntity,CompanySalesEntity,], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([CompanyTypesEntity, CompaniesEntity, CompanyDashboardClickEntity, DepartmentsEntity, LocationsEntity, KeyContactsEntity, ActivePluginsEntity, AssignBrokerEntity, CensusCustomFieldsEntity, CensusCustomFieldsValuesEntity,
            CensusFrequencyEntity, CompanyDashboardEntity, InterlinksEntity, PhysicianTempsEntity, CompanyContractEntity, CompanyMetaEntity, CompanySettingsEntity, CompanyReportMenuSettingsEntity,
            CompanySideMenuSettingsEntity, CompanySupportsEntity, WellnessAssignmentEntity, CompanyLanguagesEntity, AssignEngagementManagerEntity, GlobalAccessEntity, ClientManagerAssignEntity, cCompanySupport, MembershipPlanEntity, MediaCategoryEntity,CompanyMasscommunicationEntity,CompanyCEMInfoEntity,CompanyNumberOfLiveReportsEntity,CompanySalesEntity,], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        CompanyTypesService,
        CompanyService,
        DepartmentService,
        LocationService,
        KeyContactService,
        ActivePluginService,
        AssignBrokerService,
        DashboardService,
        DashboardClickService,
        InterlinksService,
        PhysicianTempService,
        ContractService,
        MetaService,
        SettingsService,
        ReportMenuSettingsService,
        SideMenuSettingsService,
        SupportService,
        WellnessAssignmentService,
        CompanyLanguagesService,
        CensusCustomFieldsService,
        CensusCustomFieldsValuesService,
        CensusFrequencyService,
        AssignEngagementMangerService,
        GlobalAccessService,
        ClientManagerAssignService,
        CCompanySupportService,
        MembershipPlanService,
        FrontService,
        MassCommunicationService,
        CEMInfoService,
        CompanyNumberOfLiveReportsService,
        OrgCensusReportService,
        SalesService,
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD ,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'TIMEZONE_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'CRON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CRON_SERVICE_HOST_PROD,
                        port: Number(process.env.CRON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    controllers: [
        CompanyTypesController,
        CompanyController,
        DepartmentController,
        LocationController,
        KeyContactController,
        ActivePluginController,
        AssignBrokerController,
        dashboardsController,
        InterlinksController,
        PhysicianTempController,
        ContractController,
        MetaController,
        SettingsController,
        ReportMenuSettingsController,
        SideMenuSettingsController,
        SupportController,
        WellnessAssignmentController,
        LanguagesController,
        CensusCustomFieldsController,
        CensusCustomFieldsValuesController,
        CensusFrequencyController,
        AssignEngagementMangerController,
        GlobalAccessController,
        ClientManagerAssignController,
        CCompanySupportController,
        MembershipPlanController,
        MassCommnicationController,
        CEMInfoController,
        CompanyNumberOfLiveReportController,
        OrgCensusReportController,
        SalesController,
    ],
    exports: [
        CompanyTypesService,
        CompanyService,
        DepartmentService,
        LocationService,
        KeyContactService,
        ActivePluginService,
        AssignBrokerService,
        DashboardService,
        DashboardClickService,
        InterlinksService,
        PhysicianTempService,
        ContractService,
        MetaService,
        SettingsService,
        ReportMenuSettingsService,
        SideMenuSettingsService,
        SupportService,
        WellnessAssignmentService,
        CompanyLanguagesService,
        CensusCustomFieldsService,
        CensusCustomFieldsValuesService,
        CensusFrequencyService,
        AssignEngagementMangerService,
        GlobalAccessService,
        ClientManagerAssignService,
        CCompanySupportService,
        MembershipPlanService,
        FrontService,
        MassCommunicationService,
        CEMInfoService,
        CompanyNumberOfLiveReportsService,
        OrgCensusReportService,
        SalesService,
    ],
})
export class CompanyModule {}
