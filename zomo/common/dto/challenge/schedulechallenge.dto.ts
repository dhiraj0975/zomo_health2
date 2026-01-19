import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { BingoWeekLabelsDto } from './bingoweeklabels.dto';
import { ChallengeDto } from './challenge.dto';
import { CommitmentLevelsDto } from './commitmentlevels.dto';
import { InviteTempDto } from './invitetemp.dto';
import { InviteUserDto } from './inviteuser.dto';
import { MoveMoreParksDto } from './movemoreparks.dto';
import { ScheduleChallengeAgreementDto } from './schedulechallengeagreement.dto';
import { StepCheckPointsDto } from './stepcheckpoints.dto';
import { TagsDto } from './tags.dto';
import { WeeksStepsDto } from './weekssteps.dto';
export class ScheduleChallengeDto {
    @Expose() id: number;
    @Expose() challenge_id?: number;
    @Expose() org_id?: number;
    @Expose() custom_cname?: string;
    @Expose() custom_logo?: string;
    @Expose() custom_desc?: string;
    @Expose() dpt_id?: string;
    @Expose() loc_id?: string;
    @Expose() eligibility: number = 0;
    @Expose() difficulty: number = 0;
    @Expose() tag_id?: string;
    @Expose() display_setting: number = 0;
    @Expose() streak_setting?: number = 1;
    @Expose() difficulty_setting?: number = 1;
    @Expose() tags_setting?: number = 1;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    reg_start_date: string;
    @Expose()
    reg_end_date: string;
    @Expose()
    deactive_date: string;
    @Expose() deactive_time?: string;
    @Expose() created_by: number = 0;
    @Expose() challenge_who?: string;
    @Expose() is_nolimit: number = 0;
    @Expose() numberofsteps?: number;
    @Expose() time_elapsed?: number;
    @Expose() is_set_weekend: number = 0;
    @Expose() dailymaxstepscnt?: number;
    @Expose() countuserwithzero?: string;
    @Expose() countstepswith: string;
    @Expose() yard: number;
    @Expose() date_validation_setting?: string;
    @Expose() enable_week_log: number = 0;
    @Expose() is_hide_daylabel: number = 0;
    @Expose() is_hide_weeklabel: number = 0;
    @Expose() rank_type?: string;
    @Expose() s_activity_tracker: number = 1;
    @Expose() s_steps: number = 1;
    @Expose() s_walking: number = 1;
    @Expose() s_running: number = 1;
    @Expose() s_cycling: number = 1;
    @Expose() s_swimming: number = 1;
    @Expose() leaderboard_setting: number = 3;
    @Expose() team: number = 0;
    @Expose() teamsize?: number;
    @Expose() team_created_from: number;
    @Expose() join_team_status: number;
    @Expose() group_status: number;
    @Expose() group_order: number;
    @Expose() weight_insert_date?: number;
    @Expose()
    rangestartdate: string;
    @Expose()
    rangeenddate: string;
    @Expose()
    s_rangestartdate: string;
    @Expose()
    s_rangeenddate: string;
    @Expose() display_ranking?: string;
    @Expose() ftns_activity_limit?: number;
    @Expose() is_ftns_activity_limit: number = 0;
    @Expose() is_ftns_activity_custome: number = 0;
    @Expose() lock_teams?: string;
    @Expose() oz_water_per_day?: number;
    @Expose() is_oz_meet_require_day: number = 1;
    @Expose() oz_meet_require_day: number = 15;
    @Expose() ft_average_per_week: number = 0;
    @Expose() yardfrequency?: string;
    @Expose() individualmeetgoal?: string;
    @Expose() tr_totalgoaltype: string;
    @Expose() tr_totalgoalvalue: number;
    @Expose() tr_goaltype: number;
    @Expose() checkpointstep_type: number;
    @Expose() square_complete_limit: number = 0;
    @Expose() card_complete_limit: number;
    @Expose() last_week_grows_day: number = 0;
    @Expose() accessibility: number = 0;
    @Expose() card_week_relation: number = 0;
    @Expose() bingo_self: number = 0;
    @Expose() external_link?: string;
    @Expose() is_mail: number = 1;
    @Expose() move_more_user?: string;
    @Expose() move_more_display: number = 0;
    @Expose() move_more_show_images: number = 0;
    @Expose() move_more_show_info: number = 0;
    @Expose() move_more_show_website: number = 0;
    @Expose() move_more_show_map: number = 0;
    @Expose() lock_steplog_website_click: number = 0;
    @Expose() race_type?: number;
    @Expose() status: number = 1;
    @Expose()
    backdating_frequency: string;
    @Expose() is_copy: number = 0;
    @Expose() requirement_base_on: number = 0;
    @Expose() goal_base_on: number = 0;
    @Expose() max_num_of_token: number = 0;
    @Expose() max_num_of_enter_token?: string;
    @Expose() comment: number = 0;
    @Expose() hide_comment: number = 0;
    @Expose() hide_history: number = 0;
    @Expose() hide_leaderboard: number = 0;
    @Expose() auto_email: number = 0;
    @Expose() total_enter_token: string;
    @Expose() whocanreceiveatoken: number = 0;
    @Expose() goalbasefrquency: number = 0;
    @Expose() leaderboardbasefrquency: number = 0;
    @Expose() map_button?: string;
    @Expose() website_button?: string;
    @Expose() info_button?: string;
    @Expose() image_button?: string;
    @Expose() is_all_activities: number = 0;
    @Expose() enteratotalactivity?: number;
    @Expose() is_leaderboard_ask: number = 0;
    @Expose() teamproctype: number = 1;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => ChallengeDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                challenge_name: value.challenge_name,
                challenge_type: value.challenge_type,
                bio_challenge_type: value.bio_challenge_type,
                stepactivity_type: value.stepactivity_type,
                requirementbased: value.requirementbased,
                logo: value.logo,
                icon: value.icon,
            };
        }
    })
    challenge: ChallengeDto;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj?.challenge) {
            return obj['challenge'] = obj.challenge?.challenge_type;
        }
    })
    challenge_type: string;
    @Expose()
    @Type(() => StepCheckPointsDto)
    checkpoint: StepCheckPointsDto;
    @Expose()
    @Type(() => WeeksStepsDto)
    weekstep: WeeksStepsDto;
    @Expose()
    @Type(() => InviteUserDto)
    inviteUser: InviteUserDto;
    @Expose()
    @Type(() => InviteTempDto)
    inviteUserTemp: InviteTempDto;
    @Expose()
    @Type(() => CommitmentLevelsDto)
    treklevel: CommitmentLevelsDto;
    @Expose()
    @Type(() => ScheduleChallengeAgreementDto)
    agreement: ScheduleChallengeAgreementDto;
    @Expose()
    @Type(() => MoveMoreParksDto)
    movemore: MoveMoreParksDto;
    @Expose()
    @Type(() => BingoWeekLabelsDto)
    weeklabel: BingoWeekLabelsDto;
    @Expose()
    @Type(() => TagsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','title','status'].includes(key)) {
                        delete element[key];
                    }
                    });
            }
            return value;
        }
        else {
            return []
        }
    })
    tags: TagsDto[];
}
