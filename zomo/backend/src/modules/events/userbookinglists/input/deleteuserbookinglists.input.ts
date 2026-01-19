import { Allow } from 'class-validator';
export class DeleteUserBookingListsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
}
