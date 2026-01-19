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
@Entity({ name: tableConstant.THEMES.TBL_SETTINGS })
export class OrgThemesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: true })
    theme_id: number;
    @Column('integer', { nullable: true })
    org_id: number;
    @Column('text', { nullable: true })
    themetype: string;
    @Column('integer', { nullable: true })
    iscustomized: number;
    @Column('text', { nullable: true })
    bodycolor: string;
    @Column('text', { nullable: true })
    bodyfontcolor: string;
    @Column('text', { nullable: true })
    pagecontentbgcolor: string;
    @Column('text', { nullable: true })
    headercolor: string;
    @Column('text', { nullable: true })
    mainnavigationactive: string;
    @Column('text', { nullable: true })
    subnavigationactive: string;
    @Column('text', { nullable: true })
    navigationfontcolor: string;
    @Column('text', { nullable: true })
    pagetitlebgcolor: string;
    @Column('text', { nullable: true })
    mainpagetitlecolor: string;
    @Column('text', { nullable: true })
    pagetitlecolor: string;
    @Column('text', { nullable: true })
    innercontentcolor: string;
    @Column('text', { nullable: true })
    breadbgcolor: string;
    @Column('text', { nullable: true })
    breadfontcolor: string;
    @Column('text', { nullable: true })
    linkcolor: string;
    @Column('text', { nullable: true })
    sidetogcolor: string;
    @Column('text', { nullable: true })
    successbgcolor: string;
    @Column('text', { nullable: true })
    successfontcolor: string;
    @Column('text', { nullable: true })
    errorbgcolor: string;
    @Column('text', { nullable: true })
    errorfontcolor: string;
    @Column('text', { nullable: true })
    btndarkbgcolor: string;
    @Column('text', { nullable: true })
    btndarkhovercolor: string;
    @Column('text', { nullable: true })
    btngreenbgcolor: string;
    @Column('text', { nullable: true })
    btngreenhovercolor: string;
    @Column('text', { nullable: true })
    bodywithallcolor: string;
    @Column('text', { nullable: true })
    navigationallcolor: string;
    @Column('text', { nullable: true })
    esubnavigationactive: string;
    @Column('text', { nullable: true })
    pagewithallcolor: string;
    @Column('text', { nullable: true })
    spointtrackbgwarningcolor: string;
    @Column('text', { nullable: true })
    spointtrackbgsuccesscolor: string;
    @Column('text', { nullable: true })
    spointtrackfontlabelcolor: string;
    @Column('text', { nullable: true })
    spointtrackbglabelcolor: string;
    @Column('text', { nullable: true })
    pointtrackfontsuccesscolor: string;
    @Column('text', { nullable: true })
    pointtrackbgsuccesscolor: string;
    @Column('text', { nullable: true })
    pointtrackfontwarningcolor: string;
    @Column('text', { nullable: true })
    pointtrackbgwarningcolor: string;
    @Column('text', { nullable: true })
    pointtrackcolor: string;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    added_date: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_date: Date;
    @Column('integer', { nullable: true })
    status: number;
}
