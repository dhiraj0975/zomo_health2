import { Allow } from 'class-validator';
export class CreateCommunicationEmailAttachmentTypeInput {
    @Allow() id: number;
    @Allow() type: string;
    @Allow() mime: string;
    @Allow() icon: string;
    @Allow() extension: string;
    @Allow() status: number;
}
