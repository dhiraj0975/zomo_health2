import { Allow } from 'class-validator';
export class CreateBioWeightInput {
    @Allow() user_id: number;
    @Allow() weight: string;
    @Allow() schedule_id: number;
    @Allow() schedule_join_id: number;
    @Allow() added_date: string;
}
