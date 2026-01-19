import { Expose, Transform, Type } from 'class-transformer';
import { DiseasesDto } from './diseases.dto';
export class DiseaseStandardCareDto {
    @Expose() id: number;
    @Expose() disease_id: number;
    @Expose() title: string;
    @Expose() desc: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => DiseasesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                title: value?.title,
            };
        }
        else {
            return null
        }
    })
    disease: DiseasesDto;
}
