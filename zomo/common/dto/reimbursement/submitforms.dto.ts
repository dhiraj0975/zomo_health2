import { Expose, Transform, Type } from 'class-transformer';
import { ActivitiesDto } from '../activity';
import { CompaniesDto } from '../company';
import { UserDto } from '../user';
import { ReimbursementCreateFormsDto } from './createforms.dto';
let S3_URL = process.env.S3_URL_PROD
S3_URL = S3_URL?.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
export class ReimbursementSubmitFormsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() org_id: number;
    @Expose() form_id: number;
    @Expose() activity_id: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
    (value && value.includes('subforms') ? S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD) + value : value
    ), { toClassOnly: true })
    attachments: string;
    @Expose() reim_amount: number;
    @Expose() notes: string;
    @Expose() decline_reason: string;
    @Expose() popup_status: number;
    @Expose() approval_type: number;
    @Expose() status: number;
    @Expose() deleted: number;
    @Expose()
    activity_date: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => ReimbursementCreateFormsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
                approval_type: value.approval_type,
                attachment_req:value.attachment_req,
            };
        }
        else {
            return null
        }
    })
    createForm: ReimbursementCreateFormsDto;
    @Expose()
    @Type(() => ActivitiesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                activity_name: value.activity_name,
                accebility: value.accebility,
                accebilitytranslation: value.accebilitytranslation,
            };
        }
        else {
            return null
        }
    })
    activity: ActivitiesDto;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                timezone: value.timezone,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
