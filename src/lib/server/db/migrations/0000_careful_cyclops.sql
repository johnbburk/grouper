CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `group_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer,
	`student_id` integer,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `grouping_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer,
	`student1_id` integer,
	`student2_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student1_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student2_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pairing_matrix` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id_1` integer NOT NULL,
	`student_id_2` integer NOT NULL,
	`class_id` integer NOT NULL,
	`pair_count` integer DEFAULT 0 NOT NULL,
	`last_paired` text
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`class_id` integer,
	`grouping_history` text DEFAULT '[]',
	`non_standard_groupings` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `study_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`class_id` integer,
	`created_at` text NOT NULL
);
