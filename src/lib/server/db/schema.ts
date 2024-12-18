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
	subgroupNumber: integer('subgroup_number').notNull(),
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

export const groupingRules = sqliteTable('grouping_rules', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
	student1Id: integer('student1_id').references(() => students.id, { onDelete: 'cascade' }),
	student2Id: integer('student2_id').references(() => students.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').notNull()
});

export const studentPairs = sqliteTable('student_pairs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	classId: integer('class_id').notNull().references(() => classes.id),
	student1Id: integer('student1_id').notNull(),
	student2Id: integer('student2_id').notNull(),
	groupId: integer('group_id').notNull(),
	createdAt: text('created_at').notNull()
});

export type GroupingRule = typeof groupingRules.$inferSelect;
