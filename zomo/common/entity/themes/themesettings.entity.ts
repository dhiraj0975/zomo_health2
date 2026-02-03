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
@Entity({ name: tableConstant.THEMES.TBL_THEMES_SETTINGS })
export class ThemeSettingsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true, default: 0 })
    org_id: number;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    theme_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    header_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    link_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    icons_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    button_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#066CFF' })
    progress_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#6CA540' })
    progress_hra_low_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#ffb848' })
    progress_hra_mod_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#E34D43' })
    progress_hra_high_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#E02222' })
    progress_hra_very_high_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#734702' })
    progress_very_high_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#209985' })
    table_color: string;
    @Column('varchar', { length: 50, nullable: true, default: '#F1F7F8' })
    background_color: string;
    @Column('integer', { nullable: true, default: 0 })
    enable_theme_mode: number;

    @Column('integer', { nullable: true, default: 0 })
    reference_id: number;

    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column('integer', { default: 1 })
    status: number;
}
