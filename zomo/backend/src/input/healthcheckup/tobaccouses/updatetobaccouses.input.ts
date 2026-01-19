import { Allow } from 'class-validator';
export class UpdateTobaccoUsesInput {
    @Allow() id: number;
}
