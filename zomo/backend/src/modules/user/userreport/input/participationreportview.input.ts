import { Allow } from 'class-validator';
export class ParticipationReportViewInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
