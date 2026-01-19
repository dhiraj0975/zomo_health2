import { Expose, Transform, Type } from 'class-transformer';
let S3_URL = process.env.NODE_ENV == 'PROD' ? process.env.S3_URL_PROD : process.env.S3_URL_DEV

export class CompanyContractDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() billing_frequency: number;
    @Expose() billing_email: string;
    @Expose() billing_name: string;
    @Expose() engagement_manager_name: string;
    @Expose() package: number;
    @Expose() expense_description_amount: string;
    @Expose() reminder_contract: string;
    @Expose() contract_reminder_email: string;
    @Expose() broker: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    contract_start_date: string;
    @Expose()
    contract_end_date: string;
    @Expose()
    billing_start_date: string;
    @Expose()
    billing_end_date: string;
    @Expose()
    date_of_expense_submission: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    billing_email_cc: string;
    @Expose()
    notes_for_data_team: string;
    @Expose()
    notes_for_design_team: string;
    @Expose()
    branding_guideline_text: string;
    @Expose()
    industry: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj && obj.csa && obj.csa != ''){
            let csa = [];
            if(typeof obj.csa == 'string'){
                for(let ele of JSON.parse(obj.csa)){
                    if (ele.includes('comcsa')) {
                        csa.push(ele);
                    } else {
                        csa.push(`comcsa/${obj.org_id}/${ele}`);
                    }
                }
            }
            if(typeof obj.csa == 'object'){
                csa = obj.csa;
            }
            return csa;            
        }
        else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    csa: string;
    @Expose()
    @Type(() => String)
    baa: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.branding_guideline_image && obj.branding_guideline_image.includes('combimg_') && !obj.branding_guideline_image.includes(S3_URL)) {
            return S3_URL + obj.branding_guideline_image;
        } else {
            return obj.branding_guideline_image;
        }
    }, {
        toClassOnly: true,
    })
    branding_guideline_image: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj && obj.additional_agreement && obj.additional_agreement != ''){
            let additional_agreement = [];
            if(typeof obj.additional_agreement == 'string'){
                for(let ele of JSON.parse(obj.additional_agreement)){
                    if (ele.includes('comagreement')) {
                        additional_agreement.push(ele);
                    } else {
                        additional_agreement.push(`comagreement/${obj.org_id}/${ele}`);
                    }
                }
            }
            if(typeof obj.additional_agreement == 'object'){
                additional_agreement = obj.additional_agreement;
            }
            return additional_agreement;            
        }
        else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    additional_agreement: string;
}
