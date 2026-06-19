import type { EngineType } from './types';

export function quoteIdentifier(name: string, engine: EngineType): string {
	switch (engine) {
		case 'postgresql':
		case 'sqlite':
			return `"${name.replace(/"/g, '""')}"`;
		case 'mysql':
			return `\`${name.replace(/`/g, '``')}\``;
		case 'mongodb':
			return name;
	}
}
