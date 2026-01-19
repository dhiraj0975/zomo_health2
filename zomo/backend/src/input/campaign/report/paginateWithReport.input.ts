import { Allow } from 'class-validator';
export class PaginateWithReportInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() search_str: string;
}