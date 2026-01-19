import { Allow } from 'class-validator';
export class CopycategoryInput {
    @Allow() id: number;
    @Allow() CategoryEntity: string;
}
