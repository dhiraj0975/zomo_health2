import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from './companies.dto';
import { CompanyContractDto } from './companycontract.dto';
const S3_URL =  process.env.S3_URL_PROD
const moment = require('moment');
export class CompanySalesDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() demo_lead: string;
    @Expose()
    demo_date: string;
    @Expose()
    onboarding_date: string;
    @Expose()
    launch_date: string;
    // @Expose() demo_recording: string;
    @Expose() demo_notes: string;
    @Expose() is_zomo_health_selected: number;
    @Expose() decline_reason: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    // @Type(() => String)
    // @Transform(({ obj }) => {
    //     if (obj && obj.demo_recording && obj.demo_recording.includes('demofiles_')) {
    //         return `${S3_URL}demofiles/${obj.id}/${obj.demo_recording}`;
    //     } else {
    //         return obj.demo_recording;
    //     }
    // }, {
    //     toClassOnly: true,
    // })
    demo_recording: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            let retainsionPeriod = null;
            if(value.created){
                retainsionPeriod = moment().diff(moment(value.created), 'years');
            }
            return {
                id: value.id,
                company_name: value.company_name,
                street_address: value?.street_address,   
                state: value?.state,   
                city: value?.city,   
                country: value?.country,   
                zip: value?.zip,   
                retention: retainsionPeriod,   
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => CompanyContractDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                industry: value.industry,
                broker: value.broker,
                package: value.package,
            };
        }else {
            return null
        }
    })
    company_contract: CompanyContractDto;
}
