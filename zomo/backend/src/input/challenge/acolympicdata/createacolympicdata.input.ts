import { Allow } from 'class-validator';
export class CreateAcOlympicDataInput {
    @Allow() user_id: number;
    @Allow() schedule_id: number;
    @Allow() activity_id: number;
    @Allow() activity_cus_desc: string;
    @Allow() minutes: number;
    @Allow() added_date: string;
    @Allow() status: number;
}
