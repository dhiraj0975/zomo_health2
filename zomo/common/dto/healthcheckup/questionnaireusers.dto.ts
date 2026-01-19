import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { UserDto } from '../user';
export class QuestionnaireUsersDto {
    @Expose()
    id: number;
    @Expose()
    org_id: number;
    @Expose()
    user_id: number;
    @Expose()
    entry_name: string;
    @Expose()
    entry_empid: string;
    @Expose()
    medical_status_one: number;
    @Expose()
    medical_status_two: number;
    @Expose()
    status: number;
    @Expose()
    participation_wp: number;
    @Expose()
    participation_wp_data: number;
    @Expose()
    wellness_score_one: number;
    @Expose()
    wellness_score_two: number;
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
                role_id: value.role_id,
                role_name: value.role.title,
                username: value.username,
                status: value.status,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                email: value.email,
                wphone: value?.settings?.wphone,
                hphone: value?.settings?.hphone
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}