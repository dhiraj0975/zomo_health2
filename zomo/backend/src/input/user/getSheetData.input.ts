import {Allow} from 'class-validator';
export class GetSheetDataInput {
    @Allow() id: string;
}