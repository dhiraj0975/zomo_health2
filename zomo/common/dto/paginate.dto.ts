import {SortDirection} from "../interface";

export class PaginateDto {
    page?: number = 1;
    limit?: number = 10;
    order?: SortDirection = 'ASC';
    orderBy?: string = 'id';
}