import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const classes = sqliteTable('classes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull()
});

export const students = sqliteTable('students', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	classId: integer('class_id'),
	groupingHistory: text('grouping_history').default('[]'),
	nonStandardGroupings: integer('non_standard_groupings').default(0)
});

export const studyGroups = sqliteTable('study_groups', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name'),
	classId: integer('class_id'),
	createdAt: text('created_at').notNull()
});

export const groupAssignments = sqliteTable('group_assignments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	groupId: integer('group_id'),
	studentId: integer('student_id'),
	date: text('date').notNull()
});

export const pairingMatrix = sqliteTable('pairing_matrix', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	studentId1: integer('student_id_1').notNull(),
	studentId2: integer('student_id_2').notNull(),
	classId: integer('class_id').notNull(),
	pairCount: integer('pair_count').notNull().default(0),
	lastPaired: text('last_paired')
});
