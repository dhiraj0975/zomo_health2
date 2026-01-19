import { Allow } from 'class-validator';
export class CreateDashboardWidgetsInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() leftdiv: string;
    @Allow() rightdiv: string;
    @Allow() status: number;
}
