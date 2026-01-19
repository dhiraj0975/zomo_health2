import { Transform, Type, Expose } from 'class-transformer';
import { DiseasesDto } from './diseases.dto';
export class DiseaseFormDto {
    @Expose() id: number;
    @Expose() code: string;
    @Expose() title: string;
    @Expose() disease_id: number;
    @Expose() coverpage_text: string;
    @Expose() instructions_text: string;
    @Expose() standard_id: string;
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
                id: value.id,
                title: value.title,
            };
        }
        else {
            return null
        }
    })
    disease: DiseasesDto;
}
