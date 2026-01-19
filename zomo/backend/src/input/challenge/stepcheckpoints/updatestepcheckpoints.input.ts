import { Allow } from 'class-validator';
export class UpdateStepCheckPointsInput {
    @Allow() id: number;
    @Allow() challenge_id: number;
    @Allow() schedule_id: number;
    @Allow() checkpointvalue: number;
    @Allow() checkpointtype: string;
    @Allow() checkpointdays: number;
    @Allow() status: number;
}
