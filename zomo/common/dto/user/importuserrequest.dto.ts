import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from '../company';
export class ImportUserRequestDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() origional_file: string;
    @Expose() created_file: string;
    @Expose() updated_file: string;
    @Expose() rejected_file: string;
    @Expose() user_notify: number;
    @Expose() reset_password: number;
    @Expose() email: string;
    @Expose() flage: number;
    @Expose() sysissue: number;
    @Expose() lastdata: number;
    @Expose() requeststep: number;
    @Expose() file_error: string;
    @Expose() parent_id: number;
    @Expose() hash: string;
    @Expose() created_count: number;
    @Expose() updated_count: number;
    @Expose() rejected_count: number;
    @Expose() terminated_file: string;
    @Expose() terminated_count: number;
    @Expose() census_upload_type: number;
    @Expose() terminate_step: number;
    @Expose() mapped_header: string;
    @Expose() spouserequired: number;
    @Expose() census_upload_type_on: number;
    @Expose() source_type: number;
    @Expose() cuser_notify: number;
    @Expose() partial_count: number;
    @Expose() partial_file: string;
    @Expose() status: number;
    @Expose()
    request_date: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose() skip_count: number;
    @Expose() skip_file: string;
}
