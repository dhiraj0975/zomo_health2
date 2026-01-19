import {Expose, Transform, Type} from 'class-transformer';
import {CompaniesDto} from "../company";
import {UserDto} from "../user";
export class FtAuthorizedUsersDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() username: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.company_name,
                code: value.code
            };
        } else {
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
                middle_name: value.middle_name,
                last_name: value.last_name,
                email: value.email,
                org_id: value.org_id,
                membership_code: value.membership_code
            };
        } else {
            return null
        }
    })
    user: UserDto;
}
