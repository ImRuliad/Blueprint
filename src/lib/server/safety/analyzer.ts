export interface SafetyRisk {
	riskType: 'destructive' | 'bulk_update' | 'ddl' | 'always_true_where';
	statement: string;
	affectedObject: string;
}

const ALWAYS_TRUE_PATTERNS = [
	'1=1', '1 = 1', 'true', '1<>0', '1 <> 0',
	"'a'='a'", "'a' = 'a'", 'null is null',
];

function extractAffectedObject(sql: string): string {
	const match = sql.match(/(?:drop\s+table\s+|truncate\s+(?:table\s+)?|delete\s+from\s+|update\s+|alter\s+table\s+|create\s+table\s+)(?:if\s+(?:not\s+)?exists\s+)?[`"']?(\w+)[`"']?/i);
	return match?.[1] ?? 'unknown';
}

function hasWhereClause(sql: string): boolean {
	const noStrings = sql.replace(/'[^']*'/g, "''");
	return /\bwhere\b/i.test(noStrings);
}

function hasAlwaysTrueWhere(sql: string): boolean {
	const lower = sql.toLowerCase().replace(/\s+/g, ' ').trim();
	const whereIdx = lower.indexOf('where ');
	if (whereIdx === -1) return false;
	const whereClause = lower.slice(whereIdx + 6).trim();
	return ALWAYS_TRUE_PATTERNS.some((p) => whereClause.startsWith(p));
}

export function analyzeQuery(sql: string): SafetyRisk | null {
	const trimmed = sql.trim();
	if (!trimmed) return null;

	const upper = trimmed.toUpperCase().replace(/\s+/g, ' ');

	if (upper.startsWith('DROP TABLE') || upper.startsWith('DROP DATABASE')) {
		return { riskType: 'destructive', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
	}

	if (upper.startsWith('TRUNCATE')) {
		return { riskType: 'destructive', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
	}

	if (upper.startsWith('DELETE')) {
		if (!hasWhereClause(trimmed)) {
			return { riskType: 'bulk_update', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
		}
		if (hasAlwaysTrueWhere(trimmed)) {
			return { riskType: 'always_true_where', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
		}
	}

	if (upper.startsWith('UPDATE')) {
		if (!hasWhereClause(trimmed)) {
			return { riskType: 'bulk_update', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
		}
		if (hasAlwaysTrueWhere(trimmed)) {
			return { riskType: 'always_true_where', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
		}
	}

	if (upper.startsWith('ALTER TABLE') || upper.startsWith('CREATE TABLE')) {
		return { riskType: 'ddl', statement: trimmed, affectedObject: extractAffectedObject(trimmed) };
	}

	return null;
}
