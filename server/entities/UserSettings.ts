import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

interface NotificationSettings {
  mining: boolean;
  tasks: boolean;
  referrals: boolean;
  system: boolean;
}

interface PrivacySettings {
  showProfile: boolean;
  showEarnings: boolean;
  showActivity: boolean;
}

interface MiningSettings {
  autoStart: boolean;
  intensity: string;
  offlineEarnings: string;
}

interface DisplaySettings {
  theme: string;
  language: string;
  currency: string;
}

@Entity("user_settings")
export class UserSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  userId!: string;

  @Column({ type: "jsonb", default: {} })
  notifications!: NotificationSettings;

  @Column({ type: "jsonb", default: {} })
  privacy!: PrivacySettings;

  @Column({ type: "jsonb", default: {} })
  mining!: MiningSettings;

  @Column({ type: "jsonb", default: {} })
  display!: DisplaySettings;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => User, (user) => user.settings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}