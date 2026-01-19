import { Expose, Transform, Type } from 'class-transformer';
import { Communication_Type } from '../../enum';
import { UserDto } from "./user.dto";
export class UserSettingsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() address: string;
    @Expose() address2: string;
    @Expose() city: string;
    @Expose() state?: string;
    @Expose() country: string;
    @Expose() zip: string;
    @Expose() wphone: string;
    @Expose() cphone: string;
    @Expose() hphone: number;
    @Expose() fax: string;
    @Expose() wmaddress: string;
    @Expose() jobtitle: string;
    @Expose() wphone_ext: string;
    @Expose() otp_key: string;
    @Expose() otp_generated_by: number;
    @Expose() num_otp_login: number;
    @Expose() coach_type: string;
    @Expose() communication_type: string;
    @Expose() coach_area: number;
    @Expose() azure_objectid: string;
    @Expose() autouser: number;
    @Expose() device_token: string;
    @Expose() popup_status: number;
    @Expose() info_popup_status: number;
    @Expose() videofavoriteslist: string;
    @Expose() fitnessvideofavoriteslist: string;
    @Expose() is_pointsleaderboardpopup: number;
    @Expose() email_update: number;
    @Expose() email_receiving: number;
    @Expose() unsubscribe_reason: string;
    @Expose() receivetokens: number;
    @Expose() linkedin_link: string;
    @Expose() instagram_link: string;
    @Expose() twitter_link: string;
    @Expose() facebook_link: string;
    @Expose() avatar_icon: number;
    @Expose() avatar_gender: number;
    @Expose() avatar_skin_tone: string;
    @Expose() avatar_hair_color: string;
    @Expose() avatar_tshirt_color: string;
    @Expose() avatar_accessories_color: string;
    @Expose() avatar_background_color: string;
    @Expose()
    otp_created: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        const raw = obj?.communication_type;
        if (!raw) return '';

        return String(raw)
            .split(',')
            .map(num =>
                Object.keys(Communication_Type)
                    .find(
                        key =>
                            Communication_Type[key as keyof typeof Communication_Type] === Number(num)
                    )
            )
            .filter(Boolean)
            .join(',');
    })
    communication_name: string;
}
