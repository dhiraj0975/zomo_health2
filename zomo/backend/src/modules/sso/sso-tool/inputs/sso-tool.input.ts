import { Allow } from 'class-validator';
import {PaginateInput} from "@/input";
import {SortDirection} from "@common-constants";
export class SsoToolInput {
    @Allow() id: number;
    @Allow() tool_name: string;
    @Allow() tool_detail: any;
    @Allow() order_by?:string;
    @Allow() order?: SortDirection;
}
