import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { YesNo } from '../../enum';
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE })
export class ScheduleChallengeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    challenge_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    custom_cname: string;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null})
    custom_logo: string;
    @Column({ type: 'text', nullable: true, default: null})
    custom_desc: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    dpt_id: string;
    @Column({ type: 'varchar', length: 100, nullable: true, default: null })
    loc_id: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    eligibility: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    start_date: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    end_date: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    reg_start_date: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    reg_end_date: Date;
    @Column({ type: 'date', nullable: true, default: null })
    deactive_date: Date;
    @Column({ type: 'time', nullable: true, default: null })
    deactive_time: string;
    @Column({ type: 'int',nullable: false, default: 0 })
    created_by: number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null})
    challenge_who: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_nolimit: number;
    @Column({ type: 'int', nullable: true, default: null })
    numberofsteps: number;
    @Column({ type: 'int', nullable: true, default: null })
    time_elapsed: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_set_weekend: number;
    @Column({ type: 'int', nullable: true, default: null })
    dailymaxstepscnt: number;
    @Column({type: 'varchar', nullable: true, enum: YesNo, default: null})
    countuserwithzero: YesNo;
    @Column({ type: 'varchar', length: 250, nullable: false })
    countstepswith: string;
    @Column({ type: 'int', nullable: false })
    yard: number;
    @Column({type: 'enum', nullable: true, enum: YesNo, default: null})
    date_validation_setting: YesNo;
    @Column({ type: 'int', default: 0 })
    enable_week_log: number;
    @Column({ type: 'int', default: 0 })
    is_hide_daylabel: number;
    @Column({ type: 'int', default: 0 })
    is_hide_weeklabel: number;
    @Column({ type: 'varchar', length: 50, nullable: true })
    rank_type: string;
    @Column({ type: 'int', nullable: true, default: 1 })
    s_activity_tracker: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    s_steps: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    s_walking: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    s_running: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    s_cycling: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    s_swimming: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    leaderboard_setting: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    team: number;
    @Column({ type: 'int', nullable: true, default: null })
    teamsize: number;
    @Column({ type: 'int', nullable: false })
    team_created_from: number;
    @Column({ type: 'int', nullable: false })
    join_team_status: number;
    @Column({ type: 'int', nullable: false })
    group_status: number;
    @Column({ type: 'int', nullable: false })
    group_order: number;
    @Column({ type: 'int', nullable: true, default: 0 })
    weight_insert_date: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    rangestartdate: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    rangeenddate: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    s_rangestartdate: Date;
    @Column({ type: 'datetime', nullable: true, default: null })
    s_rangeenddate: Date;
    @Column({type: 'enum', enum: YesNo, nullable: true, default: null})
    display_ranking: YesNo;
    @Column({ type: 'int', nullable: true, default: null })
    ftns_activity_limit: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_ftns_activity_limit: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_ftns_activity_custome: number;
    @Column({type: 'enum', enum: YesNo, nullable: true, default: null})
    lock_teams: YesNo;
    @Column({ type: 'int', nullable: true, default: null })
    oz_water_per_day: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    is_oz_meet_require_day: number;
    @Column({ type: 'int', nullable: true, default: 15 })
    oz_meet_require_day: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    ft_average_per_week: number;
    @Column({ type: 'varchar', length: 50, nullable: true, default: null })
    yardfrequency: string;
    @Column({ type: 'varchar', length: 10, nullable: true, default: null })
    individualmeetgoal: string;
    @Column({ type: 'varchar', length: 256, nullable: false })
    tr_totalgoaltype: string;
    @Column({ type: 'int', nullable: false })
    tr_totalgoalvalue: number;
    @Column({ type: 'int', nullable: false })
    tr_goaltype: number;
    @Column({ type: 'int', nullable: false })
    checkpointstep_type: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    square_complete_limit: number;
    @Column({ type: 'int', nullable: false })
    card_complete_limit: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    last_week_grows_day: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    accessibility: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    card_week_relation: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    bingo_self: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    external_link: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    is_mail: number;
    @Column({ type: 'text', nullable: true, default: null })
    move_more_user: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_display: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_show_images: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_show_info: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_show_website: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    move_more_show_map: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    lock_steplog_website_click: number;
    @Column({ type: 'int', nullable: true, default: null })
    race_type: number;
    @Column({ type: 'int', nullable: true, default: 1 })
    status: number;
    @Column({ type: 'datetime', nullable: true, default: null })
    backdating_frequency: Date;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_copy: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    requirement_base_on: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    goal_base_on: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    max_num_of_token: number;
    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    max_num_of_enter_token: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    comment: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    hide_comment: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    hide_history: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    hide_leaderboard: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    auto_email: number;
    @Column({ type: 'varchar', length: 255, nullable: false })
    total_enter_token: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    whocanreceiveatoken: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    goalbasefrquency: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    leaderboardbasefrquency: number;
    @Column({ type: 'text', nullable: true, default: null })
    map_button: string;
    @Column({ type: 'text', nullable: true, default: null })
    website_button: string;
    @Column({ type: 'text', nullable: true, default: null })
    info_button: string;
    @Column({ type: 'text', nullable: true, default: null })
    image_button: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_all_activities: number;
    @Column({ type: 'int', nullable: true, default: null })
    enteratotalactivity: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    is_leaderboard_ask: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    teamproctype: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    difficulty: number;
    @Column('varchar',{ length: 50, nullable: false })
    tag_id: string;
    @Column({ type: 'int', nullable: false, default: 0 })
    display_setting: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    streak_setting: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    difficulty_setting: number;
    @Column({ type: 'int', nullable: false, default: 1 })
    tags_setting: number;
    @CreateDateColumn({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    update_date: Date;
}
