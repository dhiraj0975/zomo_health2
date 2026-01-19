import { Allow } from 'class-validator';
export class GetoneManualUpcomingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
