import { Transform, Type, Expose } from 'class-transformer';
import {UserDto} from "../user";
export class AssessmentHraBiometricDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() activity_id: string;
    @Expose() weight: number;
    @Expose() height_ft: number;
    @Expose() height_in: number;
    @Expose() weight_source: number;
    @Expose() bp_systolic: number;
    @Expose() bp_diastolic: number;
    @Expose() bp_source: number;
    @Expose() blood_glucose: number;
    @Expose() test_type: number;
    @Expose() blood_glucose_source: number;
    @Expose() alc: string;
    @Expose() total_cholesterol: number;
    @Expose() hdl: number;
    @Expose() ldl: number;
    @Expose() atriskldl: number;
    @Expose() triglycerides: number;
    @Expose() cholestrol_source: number;
    @Expose() body_fat: number;
    @Expose() body_fat_source: number;
    @Expose() hip: number;
    @Expose() waist: number;
    @Expose() arm: number;
    @Expose() leg: number;
    @Expose() calve: number;
    @Expose() measurement_source: number;
    @Expose() source: number;
    @Expose() status: number;
    @Expose()
    date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                username: value.username,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
