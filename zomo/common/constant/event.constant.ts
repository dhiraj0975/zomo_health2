export const eventConstant = {
    FIELD : {
        MONTH : [
                    'DATE_FORMAT(est.slotdate, "%m") AS months',
                    'est.ev_events_id',
                    'est.ev_slots_id',
                    'est.slotdate',
                    'slot.attendee_limit',
                    'slot.attendee_limit_type',
                    'est.total_booked'
                ],
        DATE : [
                    'est.slotdate',
                    'est.id',
                    'est.ev_slots_id',
                    'est.ev_events_id',
                    'slot.attendee_limit',
                    'slot.attendee_limit_type',
                    'est.total_booked'
                ],
        DATEDAY : [
                    'est.id',
                    'est.ev_slots_id',
                    'est.slotdate',
                    'est.slotstarttime',
                    'est.slotendtime',
                    'slot.id',
                    'slot.attendee_limit',
                    'slot.attendee_limit_type',
                    'slot.registration_end',
                    'slot.ev_events_id',
                    'est.total_booked'
                ],
        
    }

}