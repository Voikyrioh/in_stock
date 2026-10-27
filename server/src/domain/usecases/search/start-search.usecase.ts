import { FunctionalError, UseCase } from '@Voikyrioh/observability'
import type { SearchView } from '@in-stock/shared'
import { cleanQuery } from '../../rules/query'
import type { SearchRuns } from './search-runs'

export class StartSearchUseCase extends UseCase {
	constructor(private readonly runs: SearchRuns) {
		super()
	}

	async Execute(rawQuery: string): Promise<SearchView> {
		const query = cleanQuery(rawQuery)
		if (!query) {
			throw new FunctionalError(
				'invalid-payload',
				'Query must be 2 to 100 characters',
				undefined,
				'query-length',
			)
		}
		const run = this.runs.start(query)
		return this.runStep('Build view', () => this.runs.view(run))
	}
}

export class GetSearchUseCase extends UseCase {
	constructor(private readonly runs: SearchRuns) {
		super()
	}

	async Execute(id: string): Promise<SearchView> {
		const run = this.runs.get(id)
		if (!run)
			throw new FunctionalError('not-found', 'Search not found or expired', undefined, 'search')
		return this.runs.view(run)
	}
}
