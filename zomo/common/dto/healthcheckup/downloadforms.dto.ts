import {Expose, Transform, Type} from 'class-transformer';
export class DownloadFormsDto {
    @Expose()
    id: number;
    @Expose()
    org_id: number;
    @Expose()
    user_id: number;
    @Expose()
    membership_code: string;
    @Expose()
    condition: string;
    @Expose()
    form_type: number;
    @Expose()
    form_selection: string;
    @Expose()
    s_department: string;
    @Expose()
    s_location: string;
    @Expose()
    s_employee: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => {
        if (value && (!value.includes('undefined') && !value.includes('object Object'))) {
            let splitUrl = value.split('/');
            let imageName = splitUrl.pop();
            return imageName;
        }else {
            return null;
        }
    })
    file_name: string;
    @Expose()
    total_download: number;
    @Expose()
    request_date: string;
    @Expose()
    email: string;
    @Expose()
    status: number;
    @Expose()
    which_system: number;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
}