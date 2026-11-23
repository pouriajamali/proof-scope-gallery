import { syntheticServiceExample } from '../src/synthetic-service.mjs';

for (const mode of ['valid', 'missing', 'failed', 'wrong-output', 'wrong-request', 'over-budget', 'denied', 'unpaid']) {
  const result = await syntheticServiceExample(mode);
  console.log(JSON.stringify({ mode, payment: result.payment, service: result.service,
    authorized: result.authorization.authorized, usableWithinSuppliedPolicy: result.serviceAuthorizedAndBound,
    execution: result.execution, quality: result.quality }));
}
