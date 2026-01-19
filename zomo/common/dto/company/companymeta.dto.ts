import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from './companies.dto';
export class CompanyMetaDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() custom_text: string;
    @Expose() website: string;
    @Expose() information: string;
    @Expose() agreement_text: string;
    @Expose() due_date_text: string;
    @Expose() a_popup_title: string;
    @Expose() a_popup_text: string;  
    @Expose() a_popup_status: number;
    @Expose() a_popup_default_status: number;
    @Expose() a_popup_require: number;
    @Expose() a_popup_logo_status: number;
    @Expose() sso_dtext: string;
    @Expose() sso_dlink: string;
    @Expose() enable_widget: string;
    @Expose() user_popup_title: string;
    @Expose() plan_label: string;
    @Expose() zip_report_password: string;
    @Expose() title: string;
    @Expose() setting_dic: string;
    @Expose() newsletterthemecolors: string;
    @Expose() selectedweeks: string;
    @Expose() selectedmonths: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                code: value.code,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj && obj.emailattachment && obj.emailattachment != ''){
            const emailattachment = [];
            for(let ele of JSON.parse(obj.emailattachment)){
                if (ele.includes('comwelattch')) {
                    emailattachment.push(ele);
                } else {
                    emailattachment.push(`comwelattch/${obj.org_id}/${ele}`);
                }
            }
            return emailattachment;            
        }
        else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    emailattachment: string;
}
