import { Allow } from 'class-validator';
export class CreateStepCheckPointsInput {
    @Allow() challenge_id: number;
    @Allow() schedule_id: number;
    @Allow() checkpointvalue: number;
    @Allow() checkpointtype: string;
    @Allow() checkpointdays: number;
    @Allow() status: number;
}
