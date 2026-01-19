import { Allow } from 'class-validator';
export class AddDataChallengeInput {
    @Allow() schedule_id: number;
    @Allow() munualdata_week: string;
    @Allow() weekid: number;
    @Allow() num: string;
    @Allow() manulastatus: string;
    @Allow() shottext: string;
    @Allow() longtext: string;
    @Allow() munualdata_day: string;
    @Allow() dayid: number;
}
