import { Allow } from 'class-validator';
export class GetErrorReportingInput {
    @Allow() module: string;
    @Allow() type: string;
}
