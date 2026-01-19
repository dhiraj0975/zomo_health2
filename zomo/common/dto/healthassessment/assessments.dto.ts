import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() activity_id: number;
    @Expose() '1': string;
    @Expose() '1_qscore': number;
    @Expose() '1_WorstScore': number;
    @Expose() '2': string;
    @Expose() '2_qscore': number;
    @Expose() '2_WorstScore': number;
    @Expose() '3': string;
    @Expose() '3_qscore': number;
    @Expose() '3_WorstScore': number;
    @Expose() '4': string;
    @Expose() '4_qscore': number;
    @Expose() '4_WorstScore': number;
    @Expose() '5': string;
    @Expose() '5_qscore': number;
    @Expose() '5_WorstScore': number;
    @Expose() '6': string;
    @Expose() '6_qscore': number;
    @Expose() '6_WorstScore': number;
    @Expose() '7': string;
    @Expose() '8': string;
    @Expose() '9': string;
    @Expose() score: number;
    @Expose() na: string;
    @Expose() hra_status: number;
    @Expose() hra_reset: number;
    @Expose() language_set: number;
    @Expose() status: number;
    @Expose()
    date: string;
}
