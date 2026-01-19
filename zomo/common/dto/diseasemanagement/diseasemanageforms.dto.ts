import { Transform, Type, Expose } from 'class-transformer';
import { DiseasesDto } from './diseases.dto';
export class DiseaseManageFormsDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() disease_form_ids: string;
    @Expose() status: number;
    @Expose() deleted: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => DiseasesDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','title','status'].includes(key)) {
                      delete element[key];
                    }
                  });
            }
            return value;
        }
        else {
            return []
        }
    })
    diseases: DiseasesDto[];
}
