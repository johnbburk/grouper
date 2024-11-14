CREATE TABLE `classes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_assignments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`group_id` int,
	`student_id` int,
	`date` datetime NOT NULL,
	CONSTRAINT `group_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pairing_matrix` (
	`student_id_1` int NOT NULL,
	`student_id_2` int NOT NULL,
	`class_id` int NOT NULL,
	`pair_count` int NOT NULL DEFAULT 0,
	`last_paired` datetime
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`class_id` int,
	`grouping_history` json DEFAULT ('[]'),
	`non_standard_groupings` int DEFAULT 0,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_groups` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`class_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `study_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `group_assignments` ADD CONSTRAINT `group_assignments_group_id_study_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `study_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_assignments` ADD CONSTRAINT `group_assignments_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pairing_matrix` ADD CONSTRAINT `pairing_matrix_student_id_1_students_id_fk` FOREIGN KEY (`student_id_1`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pairing_matrix` ADD CONSTRAINT `pairing_matrix_student_id_2_students_id_fk` FOREIGN KEY (`student_id_2`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pairing_matrix` ADD CONSTRAINT `pairing_matrix_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_groups` ADD CONSTRAINT `study_groups_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;