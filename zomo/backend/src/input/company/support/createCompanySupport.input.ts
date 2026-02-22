import { Allow } from 'class-validator';
export class CreateCompanySupportInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() title: string;
    @Allow() cname: string;
    @Allow() email: string;
    @Allow() ph_number: string;
    @Allow() operation: string;
    @Allow() message: string;
    @Allow() icon: string;
    @Allow() status: number;
    @Allow() start_day: number;
    @Allow() end_day: number;
    @Allow() start_time: string;
    @Allow() end_time: string;
    @Allow() timezone: number;
}
