import { Allow } from 'class-validator';
export class CopyChallengeInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
