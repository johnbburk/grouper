import { mysqlTable, serial, varchar, int, datetime, json } from 'drizzle-orm/mysql-core';

export const classes = mysqlTable('classes', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull()
});

export const students = mysqlTable('students', {
	id: serial('id').primaryKey(),
	firstName: varchar('first_name', { length: 255 }).notNull(),
	lastName: varchar('last_name', { length: 255 }).notNull(),
	classId: int('class_id').references(() => classes.id),
	groupingHistory: json('grouping_history').$type<Array<{
		groupmateId: number;
		timestamp: string;
		groupId: number;
	}>>().default([])
});

export const studyGroups = mysqlTable('study_groups', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }),
	classId: int('class_id').references(() => classes.id),
	createdAt: datetime('created_at').notNull()
});

export const groupAssignments = mysqlTable('group_assignments', {
	id: serial('id').primaryKey(),
	groupId: int('group_id').references(() => studyGroups.id),
	studentId: int('student_id').references(() => students.id),
	date: datetime('date').notNull()
});

export const pairingMatrix = mysqlTable('pairing_matrix', {
	studentId1: int('student_id_1').references(() => students.id).notNull(),
	studentId2: int('student_id_2').references(() => students.id).notNull(),
	classId: int('class_id').references(() => classes.id).notNull(),
	pairCount: int('pair_count').notNull().default(0),
	lastPaired: datetime('last_paired'),
});
