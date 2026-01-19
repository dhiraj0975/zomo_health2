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
    AssessmentCohortReportsEntity,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { CompanyService } from '../company/company.service';
import { CohortReportsService } from '../cohortreports/cohortreports.service';
import { UserService } from '../user/user.service';
import { cronAppConstant, CronCommonService } from '../../common';
import { ActivePluginService, ReportMenuSettingsService } from '../company';
import { FrontService } from '../campaign/front/front.service';
import { SliderSettingsService } from '../campaign/slidersettings.service';
import { SpouseSettingsService } from '../campaign/spousesettings.service';
import { CampaignDashboardService } from '../campaign/campaigndashboard.service';
import { FrontCalculationService } from '../campaign/front/frontcalculation.service';
import { AutoReportSettingService } from '../autosetting/autoReportSettings.service';


@Controller('cohort-report')
export class CohortReportController {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly cohortReportsService: CohortReportsService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly cronCommonService: CronCommonService,
        private readonly activePluginService: ActivePluginService,
        private readonly commonDateService: CommonDateService,
        private readonly frontService: FrontService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly spouseSettingsService: SpouseSettingsService,
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly reportMenuSettingsService: ReportMenuSettingsService,
    ) {}

    @MessagePattern({ cmd: 'cohort-report' })
    async cohortreportgenerate() {
        return await this.cohortReportsService.cohortreportgenerate();
    }
}
