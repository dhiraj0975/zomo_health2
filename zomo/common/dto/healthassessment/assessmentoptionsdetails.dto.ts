import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentOptionsDetailsDto {
    @Expose() id: number;
    @Expose() option_id: number;
    @Expose() language_id: number;
    @Expose() option_title: string;
    @Expose() main_option_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
