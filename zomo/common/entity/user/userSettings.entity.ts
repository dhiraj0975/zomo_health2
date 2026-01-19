import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.TBL_USERS_SETTINGS })
export class UserSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column()
    user_id: number;
    @Column({ type: 'text', nullable: true })
    address: string;
    @Column({ type: 'text', nullable: true })
    address2: string;
    @Column({ length: 56 })
    city: string;
    @Column({ length: 56 })
    state: string;
    @Column({ length: 56 })
    country: string;
    @Column({ length: 11 })
    zip: string;
    @Column({ length: 15 })
    wphone: string;
    @Column({ length: 15 })
    cphone: string;
    @Column({ length: 15, nullable: true })
    hphone: string;
    @Column({ length: 11 })
    fax: string;
    @Column({ length: 320, nullable: true })
    wmaddress: string;
    @Column({ length: 251 })
    jobtitle: string;
    @Column({ length: 15 })
    wphone_ext: string;
    @Column({ length: 60 })
    otp_key: string;
    @Column({ nullable: true })
    otp_created: Date;
    @Column({ default: 0})
    otp_generated_by: number;
    @Column()
    num_otp_login: number;
    @Column({ length: 1 })
    coach_type: string;
    @Column('varchar',{length: 21})
    communication_type: string;
    @Column({ nullable: true })
    coach_area: number;
    @Column({ length: 512, nullable: true })
    azure_objectid: string;
    @Column()
    autouser: number;
    @Column({ length: 512, nullable: true })
    device_token: string;
    @Column()
    popup_status: number;
    @Column()
    info_popup_status: number;
    @Column({ type: 'text', nullable: true })
    videofavoriteslist: string;
    @Column({ type: 'text', nullable: true })
    fitnessvideofavoriteslist: string;
    @Column()
    is_pointsleaderboardpopup: number;
    @Column({ type: 'tinyint', default: 0 })
    email_update: number;
    @Column({ type: 'tinyint', default: 0 })
    email_receiving: number;
    @Column({ type: 'text', nullable: true })
    unsubscribe_reason: string;
    @Column()
    receivetokens: string;
    @Column('varchar',{length: 500, nullable: true})
    linkedin_link: string;
    @Column('varchar',{length: 500, nullable: true})
    instagram_link: string;
    @Column('varchar',{length: 500, nullable: true})
    twitter_link: string;
    @Column('varchar',{length: 500, nullable: true})
    facebook_link: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
     @Column('integer', { nullable: true })
    avatar_gender: number;
    @Column('integer', { nullable: true })
    avatar_icon: number;
    @Column('varchar', { nullable: true })
    avatar_skin_tone: string;
    @Column('varchar', { nullable: true })
    avatar_hair_color: string;
    @Column('varchar', { nullable: true })
    avatar_tshirt_color: string;
    @Column('varchar', { nullable: true })
    avatar_accessories_color: string;
    @Column('varchar', { nullable: true })
    avatar_background_color: string;
}
