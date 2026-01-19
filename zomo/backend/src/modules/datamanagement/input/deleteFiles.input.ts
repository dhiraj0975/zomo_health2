import { Allow } from 'class-validator';
export class DeleteFilesInput {
    @Allow() id: number;
}