import { Allow } from 'class-validator';
export class RequestDeleteInput {
    @Allow() id: number;
}
