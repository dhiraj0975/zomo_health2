import { Allow } from 'class-validator';
export class CreateTobaccoUsesInput {
    @Allow() id: number;
}
