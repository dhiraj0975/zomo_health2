import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { QuizCategoriesDto, QuizQuizClicksDto, QuizQuizzesDto } from './index';
const S3_URL =  process.env.S3_URL_PROD
export class QuizAssignQuizOrgDto {
    @Expose() id: number;
    @Expose() quiz_id: number;
    @Expose() organization_id: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.timezone) {
                return obj.timezone;
            } else {
                return null;
            }
        }
    })
    timezone: string;
    @Expose() allow_retakes: number;
    @Expose() retakes: number;
    @Expose() status: number;
    @Expose() time_dependent: number;
    @Expose() timer_type: number;
    @Expose() quiz_time: string;
    @Expose() passing_score: number;
    @Expose() publish_result: number;
    @Expose() activity_id: number;
    @Expose() vmsg: string;
    @Expose() is_hire: number;
    @Expose() is_timezone: number;
    @Expose() webinar_id: number;
    @Expose() is_webinar: number;
    @Expose() vlink: string;
    @Expose() is_popup: number;
    @Expose() score: string;
    @Expose() label_status: number;
    @Expose() label_name: string;
    @Expose() balance_retake: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.start_time) {
                const [hours, minutes] = obj.start_time.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    start_time: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.end_time) {
                const [hours, minutes] = obj.end_time.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    end_time: number;
    @Expose()
    @Type(() => QuizQuizzesDto)
    @Transform(({ obj }) => {
        if (obj.quiz) {
            return {
                id: obj.quiz.id,
                quiz_name: obj.quiz.quiz_name,
                quiz_description: obj.quiz.quiz_description,
                image: obj.quiz.image && !obj.quiz.image.includes(S3_URL) ? S3_URL + obj.quiz.image : obj.quiz.image ?? '',
            };
        }
        else {
            return null
        }
    })
    quiz: QuizQuizzesDto;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ obj }) => {
        if (obj.company) {
            return {
                id: obj.company.id,
                company_name: obj.company.company_name,
                code: obj.company.code,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => QuizCategoriesDto)
    @Transform(({ obj }) => {
        if (obj.qc) {
            return {
                id: obj.qc.id,
                name: obj.qc.name,
            };
        }
        else {
            return null
        }
    })
    qc: QuizCategoriesDto;
    @Expose()
    @Type(() => QuizQuizClicksDto)
    @Transform(({ obj }) => {
        if (obj.qqc) {
            return {
                id: obj.qqc.id,
            };
        }
        else {
            return null
        }
    })
    qqc: QuizQuizClicksDto;
}
