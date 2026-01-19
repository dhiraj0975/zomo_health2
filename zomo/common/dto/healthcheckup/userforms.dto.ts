import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { UserDto } from '../user';
import { FormInstructionsDto } from "./forminstructions.dto";
import { UserFormsAttachmentsDto } from "./userformsattachments.dto";
export class UserFormsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() is_history: string;
    @Expose() user_id: number;
    @Expose() form_id: number;
    @Expose() zip_filename: string;
    @Expose() decline_reason: string;
    @Expose() status: number;
    @Expose() popup_status: number;
    @Expose() approval_type: number = 0;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => FormInstructionsDto)
    @Transform(({ obj }) => {
        if (!obj || !obj.formInstructions) {
            return null;
        }
        if (obj) {
            let resultedData = {};
            let i = 1;
            if (obj.formInstructions.program_custom_name !== null) {
                var programCustomNameArr = JSON.parse(obj.formInstructions.program_custom_name);
            }
            while (i <= 6) {
                if (programCustomNameArr && programCustomNameArr[i] !== '' && programCustomNameArr[i] !== null && programCustomNameArr[i] !== 'null') {
                    resultedData[i] = programCustomNameArr[i];
                } else {
                    resultedData[i] = appConstant.HEALTH_FORM_DEFAULT_DATA[i];
                }
                i++;
            }
            return {
                form: obj.form_id ? resultedData[obj.form_id] : null,
            };
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    formInstructions: FormInstructionsDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ obj }) => {
        if (!obj || !obj.user) {
            return null;
        }else{
            return {
                id: obj.user?.id,
                full_name:`${obj.user?.first_name} ${obj.user?.last_name}`,
                first_name: obj.user?.first_name,
                last_name: obj.user?.last_name,
                code: obj.user?.code || null,
                timezone: obj.user?.timezone || null
            }
        }   
    })
    user: UserDto;
    @Expose()
    @Transform(({ obj }) => {
        if (typeof obj?.status !== 'number') {
            return null;
        }
        return obj.status === 1 ? 'Pending Review' : obj.status === 2 ? 'Approved' : 'Rejected';
    }, { toClassOnly: true })
    statusText: string;
    @Expose()
    @Transform(({ obj }) => {
        if (!obj.company) {
            return null;
        }
        return {id:obj.company.id || '' , company_name : obj.company.company_name || ''}
    }, { toClassOnly: true })
    company: any;
    @Expose()
    @Type(() => UserFormsAttachmentsDto)
    @Transform(({ obj }) => {
        if (!obj || !obj.Userformsattachments) {
            return null;
        }else{
            return {
                user_form_id:obj.Userformsattachments.user_form_id,
                name:obj.Userformsattachments.name
            }
        }   
    })
    UserFormsAttachmentsDto: UserDto;
}
