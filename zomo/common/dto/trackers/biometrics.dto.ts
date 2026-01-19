import {Expose, Transform, Type} from 'class-transformer';
import { UserDto } from '../user';
export class FtBiometricsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() type: number;
    @Expose() weight: number;
    @Expose() alc: number;
    @Expose() height_ft: string;
    @Expose() height_in: string;
    @Expose() systolic: string;
    @Expose() diastolic: string;
    @Expose() chol_total: string;
    @Expose() hdl: string;
    @Expose() ldl: string;
    @Expose() triglycerides: string;
    @Expose() glucose_type: string;
    @Expose() glucose_time: string;
    @Expose() glucose: string;
    @Expose() medication: string;
    @Expose() source: number;
    @Expose() status: number;
    @Expose()
    inserted: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
