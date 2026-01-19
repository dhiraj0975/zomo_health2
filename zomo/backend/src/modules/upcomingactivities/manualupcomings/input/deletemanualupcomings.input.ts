import { Allow } from 'class-validator';
export class DeleteManualUpcomingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
