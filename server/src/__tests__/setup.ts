import { configureLogger } from '@Voikyrioh/observability'

// Quiet, transport-free logger for tests (no pino-pretty worker).
process.env.OTEL_SDK_DISABLED = 'true'
configureLogger({ pretty: false, level: 'silent' })
