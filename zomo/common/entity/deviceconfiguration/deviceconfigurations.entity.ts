import {
    AfterLoad,
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { appConstant, tableConstant } from '../../constant';
@Entity({ name: tableConstant.DEVICE_CONFIGURATION.TBL_DC_CONFIGURATIONS })
export class DeviceConfigurationsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    device_id: number;
    @Column('varchar', { length: 250, nullable: false })
    consumer_key: string;
    @Column('varchar', { length: 250, nullable: false })
    consumer_secret: string;
    @Column('varchar', { length: 255, nullable: false })
    callback_url: string;
    @Column('varchar', { length: 255, nullable: false })
    endpoint_url: string;
    @Column('varchar', { length: 255, nullable: false })
    returnpage_url: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    /*** readonly ***/
    protected device: any;
    @AfterLoad()
    getDevice() {
        this.device = {
            id: this.device_id,
            name: appConstant.DEVICE[this.device_id]
        };
    }
}
