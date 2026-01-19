import { Allow } from 'class-validator';
export class CreateManualUpcomingsInput {
    @Allow() org_id: number;
    @Allow() title: string;
    @Allow() description: string;
    @Allow() link: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() auto_remove_date: string;
    @Allow() displayoption: number;
    @Allow() status: number;
}
