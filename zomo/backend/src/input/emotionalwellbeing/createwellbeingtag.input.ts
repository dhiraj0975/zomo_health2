import { Allow } from 'class-validator';
export class CreateWellBeingTagInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() status: number;
}
