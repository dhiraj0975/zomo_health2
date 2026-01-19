import { Allow } from 'class-validator';
export class CreateBingoWeekLabelsInput {
    @Allow() schedule_id: number;
    @Allow() week_no: number;
    @Allow() week_custom_name: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() weeks: any;
}
