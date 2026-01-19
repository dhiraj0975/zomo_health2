import { Allow } from 'class-validator';
export class ImportUsersChallengeInput {
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() file: string;
    @Allow() org_sheet_header: string;
}