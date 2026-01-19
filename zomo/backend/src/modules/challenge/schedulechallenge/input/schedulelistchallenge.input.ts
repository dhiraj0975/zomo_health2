import { Allow } from 'class-validator';
export class ScheduleListChallengeInput {
    @Allow() status: number;
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() challenge_type: string;
    @Allow() type: string;
    @Allow() challengestatus: number;
}