import { Allow } from 'class-validator';
export class ActivityActivateDeactivate {
    @Allow() id: number;
    @Allow() status: string;
}