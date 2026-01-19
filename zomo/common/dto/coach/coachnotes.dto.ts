import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
export class CoachNotesDto {
    @Expose() id: number;
    @Expose() coach_id: number;
    @Expose() user_id: number;
    @Expose() contant_type: number;
    @Expose() subject: string;
    @Expose() start_time: string;
    @Expose() interaction_type: number;
    @Expose() assign_task: string;
    @Expose() note: string;
    @Expose() timezone: string;
    @Expose() recurring_pattern_type: string;
    @Expose() weekly_basis_day: string;
    @Expose() monthly_basis: string;
    @Expose() monthly_date_basis: string;
    @Expose() monthly_basis_Type: number;
    @Expose() monthly_basis_day: number;
    @Expose() year_basis_day: number;
    @Expose() year_basis_month: number;
    @Expose() priority: number;
    @Expose() user_status: number;
    @Expose() status: number;
    @Expose()
    start_date: string;
    @Expose()
    due_date: string;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                email: value.email,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
