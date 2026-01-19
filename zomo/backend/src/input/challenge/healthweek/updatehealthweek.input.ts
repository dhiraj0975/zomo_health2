import { Allow } from 'class-validator';
export class UpdateHealthWeekInput {
    @Allow() id: number;
    @Allow() challenge_id: number;
    @Allow() schedule_id: number;
    @Allow() week_id: number;
    @Allow() title: string;
    @Allow() status: number;
}
