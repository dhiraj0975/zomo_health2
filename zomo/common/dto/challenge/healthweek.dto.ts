import { Expose } from 'class-transformer';
export class HealthWeekDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() schedule_id: number;
    @Expose() week_id: number = 0;
    @Expose() title: string;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
}
