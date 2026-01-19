import { Allow } from 'class-validator';
export class CreateLanguagesInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() native: string;
    @Allow() alias: string;
    @Allow() status: number;
    @Allow() weight: number;
}
