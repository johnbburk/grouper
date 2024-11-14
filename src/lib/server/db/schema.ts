import { mysqlTable, serial, varchar, int, date } from 'drizzle-orm/mysql-core';

export const classes = mysqlTable('classes', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull()
});

export const students = mysqlTable('students', {
	id: serial('id').primaryKey(),
	firstName: varchar('first_name', { length: 255 }).notNull(),
	lastName: varchar('last_name', { length: 255 }).notNull(),
	classId: int('class_id').references(() => classes.id)
});

export const studyGroups = mysqlTable('study_groups', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }),
	classId: int('class_id').references(() => classes.id)
});

export const groupAssignments = mysqlTable('group_assignments', {
	id: serial('id').primaryKey(),
	groupId: int('group_id').references(() => studyGroups.id),
	studentId: int('student_id').references(() => students.id),
	date: date('date').notNull()
});
