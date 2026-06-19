CREATE TABLE `change_buffer_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`session_id` text NOT NULL,
	`table_name` text NOT NULL,
	`changes` text,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `column_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`table_name` text NOT NULL,
	`column_name` text NOT NULL,
	`width` integer,
	`visible` integer DEFAULT true,
	`sort_order` integer,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`engine` text NOT NULL,
	`host` text,
	`port` integer,
	`database` text,
	`username` text,
	`connection_string` text,
	`sqlite_path` text,
	`ssh_config_id` text,
	`tls_config_id` text,
	`group_name` text,
	`color` text,
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`ssh_config_id`) REFERENCES `ssh_configs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tls_config_id`) REFERENCES `tls_configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `erd_diagram_state` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`diagram_name` text DEFAULT 'default',
	`node_positions` text,
	`hidden_node_ids` text,
	`zoom` real DEFAULT 1,
	`pan_x` real DEFAULT 0,
	`pan_y` real DEFAULT 0,
	`show_column_details` integer DEFAULT true,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `query_history` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`sql` text NOT NULL,
	`executed_at` text NOT NULL,
	`duration_ms` integer,
	`row_count` integer,
	`error` text,
	FOREIGN KEY (`connection_id`) REFERENCES `connections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `safe_mode_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`session_id` text NOT NULL,
	`sql` text NOT NULL,
	`risk_type` text NOT NULL,
	`action` text NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ssh_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`port` integer DEFAULT 22,
	`username` text NOT NULL,
	`auth_method` text NOT NULL,
	`private_key_path` text,
	`use_agent` integer DEFAULT false,
	`local_port` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tls_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`ca_cert_path` text,
	`client_cert_path` text,
	`client_key_path` text,
	`server_name` text,
	`created_at` text NOT NULL
);
