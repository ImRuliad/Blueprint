import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const connections = sqliteTable('connections', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	engine: text('engine').notNull(),
	host: text('host'),
	port: integer('port'),
	database: text('database'),
	username: text('username'),
	connectionString: text('connection_string'),
	sqlitePath: text('sqlite_path'),
	sshConfigId: text('ssh_config_id').references(() => sshConfigs.id),
	tlsConfigId: text('tls_config_id').references(() => tlsConfigs.id),
	groupName: text('group_name'),
	color: text('color'),
	sortOrder: integer('sort_order').default(0),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

export const sshConfigs = sqliteTable('ssh_configs', {
	id: text('id').primaryKey(),
	host: text('host').notNull(),
	port: integer('port').default(22),
	username: text('username').notNull(),
	authMethod: text('auth_method').notNull(),
	privateKeyPath: text('private_key_path'),
	useAgent: integer('use_agent', { mode: 'boolean' }).default(false),
	localPort: integer('local_port'),
	createdAt: text('created_at').notNull(),
});

export const tlsConfigs = sqliteTable('tls_configs', {
	id: text('id').primaryKey(),
	mode: text('mode').notNull(),
	caCertPath: text('ca_cert_path'),
	clientCertPath: text('client_cert_path'),
	clientKeyPath: text('client_key_path'),
	serverName: text('server_name'),
	createdAt: text('created_at').notNull(),
});

export const queryHistory = sqliteTable('query_history', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull().references(() => connections.id),
	sql: text('sql').notNull(),
	executedAt: text('executed_at').notNull(),
	durationMs: integer('duration_ms'),
	rowCount: integer('row_count'),
	error: text('error'),
});

export const columnPreferences = sqliteTable('column_preferences', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull().references(() => connections.id),
	tableName: text('table_name').notNull(),
	columnName: text('column_name').notNull(),
	width: integer('width'),
	visible: integer('visible', { mode: 'boolean' }).default(true),
	sortOrder: integer('sort_order'),
});

export const erdDiagramState = sqliteTable('erd_diagram_state', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull().references(() => connections.id),
	diagramName: text('diagram_name').default('default'),
	nodePositions: text('node_positions', { mode: 'json' }),
	hiddenNodeIds: text('hidden_node_ids', { mode: 'json' }),
	zoom: real('zoom').default(1.0),
	panX: real('pan_x').default(0),
	panY: real('pan_y').default(0),
	showColumnDetails: integer('show_column_details', { mode: 'boolean' }).default(true),
	updatedAt: text('updated_at').notNull(),
});

export const safeModeAuditLog = sqliteTable('safe_mode_audit_log', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull(),
	sessionId: text('session_id').notNull(),
	sql: text('sql').notNull(),
	riskType: text('risk_type').notNull(),
	action: text('action').notNull(),
	timestamp: text('timestamp').notNull(),
});

export const changeBufferSnapshots = sqliteTable('change_buffer_snapshots', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull(),
	sessionId: text('session_id').notNull(),
	tableName: text('table_name').notNull(),
	changes: text('changes', { mode: 'json' }),
	savedAt: text('saved_at').notNull(),
});
