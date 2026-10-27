/**
 * OpenTelemetry (traces → SigNoz). MUST stay the first import of src/index.ts.
 * In production the Docker CMD preloads it (`--import
 * @Voikyrioh/observability/register`, service name from OTEL_SERVICE_NAME), so
 * that pg and undici are patched before the bundle links them: this call is
 * then a no-op returning the running SDK. Dev / tests: OTEL_SDK_DISABLED=true.
 */
import { initObservability } from '@Voikyrioh/observability'

export const observability = initObservability({ serviceName: 'in-stock' })
