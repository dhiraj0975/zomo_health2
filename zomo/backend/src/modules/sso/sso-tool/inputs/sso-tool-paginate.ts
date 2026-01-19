import { Allow } from 'class-validator';
import {PaginateInput} from "@/input";
export class SsoToolPaginateInput extends PaginateInput {
    @Allow() id: number;
    @Allow() tool_name: string;
    @Allow() tool_detail: any;
}
