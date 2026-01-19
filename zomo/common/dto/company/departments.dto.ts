import { Transform, Type, Expose } from 'class-transformer';
import { IsEnum } from "class-validator";
import { CompaniesDto } from './companies.dto';
enum isDefault {
    Yes = 'Yes',
    No = 'No'
}
export class DepartmentsDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() code: string;
    @Expose() dept_name: string;
    @Expose() dept_desc: string;
    @Expose() status: number;
    @IsEnum(isDefault)
    @Expose() default_dept: isDefault;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value?.code,
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
        if (obj) {
            if (obj.company_name && obj.dept_name) {
                return `${obj.company_name} - ${obj.dept_name}`;
            } else {
                return null;
            }
        }
    })
    department_name: string;
}
