import { Allow } from 'class-validator';
export class CreateTagsInput {
    @Allow() id?: number;
    @Allow() title: string;
    @Allow() status?: number;
}
