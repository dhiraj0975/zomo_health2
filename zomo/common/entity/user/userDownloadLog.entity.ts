import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BaseEntity } from 'typeorm';
import { tableConstant } from '../../constant';

@Entity({ name: tableConstant.TBL_USERS_DOWNLOAD_LOG })
export class UserDownloadLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Column({ type: 'int',nullable: true })
  user_id: number;

  @Column({ type: 'varchar', length: 201, nullable: false })
  email: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'text' })
  metadata: string; 
}
