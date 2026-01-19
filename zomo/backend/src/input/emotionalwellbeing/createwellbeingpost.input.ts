import { Allow } from 'class-validator';
export class CreateWellBeingPostInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() cat_id: number;
    @Allow() title: string;
    @Allow() link_title: string;
    @Allow() post_img: string;
    @Allow() display_type: number;
    @Allow() display_area: string;
    @Allow() atime: number;
    @Allow() atime_type: number;
    @Allow() short_desc: string;
    @Allow() more_desc: string;
    @Allow() maincollection: string;
    @Allow() secondarycategory: string;
    @Allow() status: number;
    @Allow() time: string;
}
