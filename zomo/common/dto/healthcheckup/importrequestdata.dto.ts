import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from '../company';
export class ImportRequesDatatDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() origional_file: string;
    @Expose() created_file: string;
    @Expose() updated_file: string;
    @Expose() rejected_file: string;
    @Expose() user_notify: number;
    @Expose() file_error: string;
    @Expose() created_count: number;
    @Expose() updated_count: number;
    @Expose() rejected_count: number;
    @Expose() upload_type: number;
    @Expose() status: number;
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
}
