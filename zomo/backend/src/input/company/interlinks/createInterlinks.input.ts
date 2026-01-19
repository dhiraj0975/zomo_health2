import { Allow } from 'class-validator';
export class CreateInterlinksInput {
    @Allow() id: number;
    @Allow() linktitle: string;
    @Allow() plugin: string;
    @Allow() controller: string;
    @Allow() action: string;
    @Allow() newlink: string;
    @Allow() status: number;
}
