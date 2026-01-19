import { Expose, Transform, Type } from 'class-transformer';
import { SliderSettingsDto, SpouseSettingsDto } from '../campaign';
import { QuestionnaireSettingsDto } from '../healthcheckup';
import { FormInstructionsDto } from '../healthcheckup/forminstructions.dto';
import { AssignBrokerDto } from './assignbroker.dto';
import { AssignEngagementManagerDto } from './assignengagementmanager.dto';
import { CCompanySupportDto } from './ccompanysupport.dto';
import { CensusFrequencyDto } from './censusfrequency.dto';
import { ClientManagerAssisgnDto } from './clientmanagerassign.dto';
import { CompanyCEMInfoDto } from './companyceminfo.dto';
import { CompanyContractDto } from './companycontract.dto';
import { CompanyLanguageDto } from './companylanguage.dto';
import { CompanyMetaDto } from './companymeta.dto';
import { CompanySettingsDto } from './companysettings.dto';
import { CompanyTypesDto } from "./companytypes.dto";
import { DepartmentsDto } from './departments.dto';
import { LocationsDto } from './locations.dto';
import { MembershipPlanDto } from './membershipplan.dto';
const S3_URL =  process.env.S3_URL_PROD
export class CompaniesV1Dto {
    @Expose() id: number;
    @Expose() code: string;
    @Expose() companytype_id: number;
    @Expose() company_name: string;
    // @Expose() company_logo: string;
    @Expose() phone: string;
    @Expose() street_address: string;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() zip: string;
    @Expose() country: string;
    @Expose() deleted: number;
    @Expose() status: number;
    @Expose() is_testing: number;
    @Expose() membership_plan_id: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() block_email: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.company_logo && obj.company_logo.includes('comimg_')) {
            return `${S3_URL}companylogos/${obj.id}/${obj.company_logo}`;
        } else {
            return obj.company_logo;
        }
    }, {
        toClassOnly: true,
    })
    company_logo: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.company_logo_dark && obj.company_logo_dark.includes('comimgdark_')) {
            return `${S3_URL}companylogos/${obj.id}/${obj.company_logo_dark}`;
        } else {
            return obj.company_logo_dark || '';
        }
    }, {
        toClassOnly: true,
    })
    company_logo_dark: string;
    @Expose()
    @Type(() => CompanyTypesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_type: value.company_type,
            };
        }else {
            return null
        }
    })
    company_type: CompanyTypesDto;
    @Expose()
    @Type(() => CompanySettingsDto)
    // @Transform(({ value }) => {
    //     if (value) {
    //         return {
    //             org_id: value.org_id,
    //             video_setting: value.video_setting,
    //             video_action: value.video_action,
    //             is_emo_health_asssessments: value.is_emo_health_asssessments,
    //             lock_username: value.lock_username,
    //         };
    //     }else {
    //         return null
    //     }
    // })
    company_settings: CompanySettingsDto;
    @Expose()
    @Type(() => CompanyMetaDto)
    // @Transform(({ value }) => {
    //     if (value) {
    //         return {
    //             zip_report_password: value.zip_report_password,
    //         };
    //     }else {
    //         return null
    //     }
    // })
    company_meta: CompanyMetaDto;
    @Expose()
    @Type(() => CompanyContractDto)
    // @Transform(({ value }) => {
    //     if (value) {
    //         return {
    //             zip_report_password: value.zip_report_password,
    //         };
    //     }else {
    //         return null
    //     }
    // })
    company_contract: CompanyContractDto;
    @Expose()
    @Type(() => CCompanySupportDto)
    company_support: CCompanySupportDto;
    @Expose()
    @Type(() => DepartmentsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for (let element of value) {
                element["name"] = element.dept_name;
                delete element.code;
                delete element.company_id;
                delete element.dept_desc;
                delete element.status;
                delete element.dept_name;
            }
            return value;
        }else {
            return null
        }
    })
    departments: DepartmentsDto;
    @Expose()
    @Type(() => LocationsDto)
    locations: LocationsDto;
    @Expose()
    @Type(() => CensusFrequencyDto)
    @Transform(({ value }) => {
        if (value) {
            return value.id
        }else {
            return null
        }
    })
    census_frequency: CensusFrequencyDto;
    @Expose()
    @Transform(({ obj }) => (obj.diseasemanagement ? obj.diseasemanagement = 1 : obj.diseasemanagement = 0), { toClassOnly: true })
    diseasemanagement: any;
    @Expose()
    @Type(() => QuestionnaireSettingsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                status: value.status,
            };
        }else {
            return null
        }
    })
    questionnairesettings: QuestionnaireSettingsDto;
    @Expose()
    @Type(() => FormInstructionsDto)
    forminstructions: FormInstructionsDto;
    @Expose()
    @Type(() => MembershipPlanDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.name,
            };
        }else {
            return null
        }
    })
    membership_plan: MembershipPlanDto;
    @Expose()
    @Type(() => SliderSettingsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                hide: value.hide,
                activity_page_tab: value.activity_page_tab,
                dashboard_tab: value.dashboard_tab,
                status: value.status,
            };
        }else {
            return null
        }
    })
    slidersettings: SliderSettingsDto;
    @Expose()
    @Type(() => SpouseSettingsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                hide: value.hide,
                status: value.status,
            };
        }else {
            return null
        }
    })
    spousesettings: SpouseSettingsDto;
    @Expose()
    @Type(() => AssignEngagementManagerDto)
    engagement_manager: AssignEngagementManagerDto
    @Expose()
    @Type(() => ClientManagerAssisgnDto)
    client_engagement_manager: ClientManagerAssisgnDto
    @Expose()
    @Type(() => AssignBrokerDto)
    broker: AssignBrokerDto
    @Expose()
    @Type(() => CompanyCEMInfoDto)
    company_info: CompanyCEMInfoDto
    @Expose()
    @Type(() => CompanyLanguageDto)
    language: CompanyLanguageDto
}
