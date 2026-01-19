import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
import { CovidVaccinationTypeDto } from './covidVaccinationType.dto';
let S3_URL = process.env.S3_URL_PROD;
S3_URL = S3_URL?.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
export class CovidUserAnswersDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() question_answers: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() are_you_vaccinated: number;
    @Expose() tested_positive_covid: number;
    @Expose() vaccination_type: number;
    @Expose() lastvaccinationdate: string;
    @Expose() lastreportdate: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('covid') ? S3_URL + value : value && value.includes('ans') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    vecctionationrecord: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('covid') ? S3_URL + value : value && value.includes('ans') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    testpositivecertificate: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,  
                name: value.first_name + ' ' + value.last_name,             
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => CovidVaccinationTypeDto)
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
    VacType: CovidVaccinationTypeDto;
}
