import { Allow } from 'class-validator';
export class HideshowcategoryInput {
    @Allow() id: number;
    @Allow() status: string;
}
