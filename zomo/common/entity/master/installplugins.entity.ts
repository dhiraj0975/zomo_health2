import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
import { Required } from '../../enum';
;
@Entity(tableConstant.TBL_INSTALL_PLUGINS)
export class InstallPluginsEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255, nullable: false })
    plugin_name: string;
    @Column('varchar',{ length: 255, nullable: false })
    display_name: string;
    @Column('varchar',{ length: 255, nullable: false })
    description: string;
    @Column('varchar', {  length: 5, nullable: false })
    old_plugin_version: string;
    @Column('varchar', {  length: 5, nullable: false })
    current_plugin_version: string;
    @Column('varchar', { nullable: false })
    plugin_install_date: string;
    @Column('varchar', { nullable: false })
    plugin_activate_date: string;
    @Column({
        type: 'enum',
        enum: Required,
        default: Required.Not_Required,
    })
    plugin_require_tbl_upgrade: Required;
    @Column('integer', { default: 1 })
    status: number;
    @Column('text', { nullable: false })
    plugin_tables_used: string;
}
