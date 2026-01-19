import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
import { DiseasesDto } from './diseases.dto';
import { DiseaseFormDto } from './diseaseform.dto';
export class DiseasePhysicianFormsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() activity_id: number;
    @Expose() physician_id: number;
    @Expose() disease_formid: string;
    @Expose() standard_ids: string;
    @Expose() standard_dates: string;
    @Expose() not_recommended: string;
    @Expose() signature: string;
    @Expose() is_signed: number;
    @Expose() status: number;
    @Expose() deleted: number;
    @Expose()
    date_completed: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                code: value?.code,
                first_name: value?.first_name,
                last_name: value?.last_name,
                full_name: value.full_name ?? value?.first_name + ' ' + value?.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => DiseasesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
            };
        }
        else {
            return null
        }
    })
    disease: DiseasesDto;
    @Expose()
    @Type(() => DiseaseFormDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
                code: value.code,
            };
        }
        else {
            return null
        }
    })
    form: DiseaseFormDto;
}
