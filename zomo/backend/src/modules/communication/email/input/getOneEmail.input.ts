import { Allow } from 'class-validator';
export class getOneEmailInput{
    @Allow() id: number;
    @Allow() type: string;
}
