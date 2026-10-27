// MUST be the first import: OpenTelemetry patches modules before the app imports them.
import './instrumentation'
import { configureLogger, Logger } from '@Voikyrioh/observability'
import { serve } from '@hono/node-server'
import { loadConfig } from './config'
import { createContainer } from './container'
import { createApp } from './entry-points/app'
import { every } from './entry-points/jobs/scheduler'
import { observability } from './instrumentation'

const config = loadConfig()
configureLogger({ level: config.logLevel, pretty: config.env === 'development' })
const { useCases, housekeeping, dispose } = await createContainer(config)
const app = createApp(useCases, {
	publicOrigin: config.env === 'production' ? config.publicOrigin : null,
	staticDir: config.staticDir,
	production: config.env === 'production',
})

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) =>
	Logger.info(
		{
			storage: config.storage.kind,
			static: config.staticDir ?? 'none',
			tracing: observability.enabled,
		},
		`In Stock listening on http://${info.address}:${info.port}`,
	),
)

const stops = [every('housekeeping', 3600_000, housekeeping)]
if (config.schedulerEnabled) {
	// BR-FOLLOW-003: a batch of due followed offers every minute.
	stops.push(every('refresh-followed', 60_000, () => useCases.refreshDue.Execute()))
}

function stop() {
	for (const s of stops) s()
	server.close(async () => {
		await dispose()
		Logger.info('Server stopped')
		// Pending spans are flushed to SigNoz before exiting.
		await observability.shutdown().catch(() => undefined)
		process.exit(0)
	})
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
