import {Allow} from "class-validator";
export class CreateRegionStateCityInput {
    @Allow() id: number;
    @Allow() region_id: number;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() status: number;
}