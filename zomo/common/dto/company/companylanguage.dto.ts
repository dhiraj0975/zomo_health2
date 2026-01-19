import { Transform, Type, Expose } from 'class-transformer';
import { LanguagesDto } from '../master';
export class CompanyLanguageDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() language_id: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => LanguagesDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','alias','title','native','status'].includes(key)) {
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
    languages: LanguagesDto[];
}
