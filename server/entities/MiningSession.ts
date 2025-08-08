import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity("mining_sessions")
@Index(["userId", "startTime"])
export class MiningSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "timestamp" })
  startTime!: Date;

  @Column({ type: "timestamp", nullable: true })
  endTime!: Date;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  earnings!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  hashRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 85, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  efficiency!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.miningSessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}