import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS)
export class MediaFitnessVideosEntity{
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ nullable: true })
    v_id: number;
    @Column({ nullable: true, default: 0 })
    org_id: number;
    @Column({length: 512, nullable: true })
    v_link: string;
    @Column({ nullable: true })
    name: string;
    @Column('int',{ default: 0 })
    duration: number;
    @Column({type: 'int', nullable: true })
    difficulty_id: number;
    @Column('int',{ default: 0 })
    calories: number;
    @Column({ nullable: false })
    description: string;
    @Column({ nullable: false })
    image_poster: string;
    @Column({ nullable: false })
    image_thumb: string;
    @Column('int', { nullable: true })
    duration_id: number;
    @Column('float',{ nullable: true })
    rating_avg: number;
    @Column('int',{ nullable: true })
    rating_count: number;
    @Column('float',{ nullable: true })
    rating_avg_category: number;
    @Column('int',{ nullable: true })
    rating_count_category: number;
    @Column('float',{ nullable: true })
    rating_avg_series: number;
    @Column('int',{ nullable: true })
    rating_count_series: number;
    @Column({ nullable: true })
    provider_name: string;
    @Column({type: 'int', default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
