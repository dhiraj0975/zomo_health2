import { Allow } from 'class-validator';
export class UpdateBingoWeekLabelsInput {
    @Allow() id: number;
    @Allow() schedule_id: number;
    @Allow() week_no: number;
    @Allow() week_custom_name: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() weeks: any;
}
