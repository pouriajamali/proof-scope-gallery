# Proof Scope Gallery

**A valid signature can accompany a receipt for the wrong request.**
This CPU-only project separates an existing verifier's cryptographic result,
public request/model/input/output binding, and unsupported claims.

The first profile is a constrained VC JWS service receipt, verified by pinned
`jose@6.2.18` with Ed25519. This proves an authentic statement under a configured
key. It does not prove computation, model quality, data rights or payment settlement.
It is an educational application profile, not a general VC validator or an audit.

## Run

Requires Node.js 22.14+ and npm. Installation needs registry access; tests run
offline, without accounts, tokens, secrets, paid infrastructure, models or GPUs.

```sh
npm ci --ignore-scripts
npm test
npm run demo
npm run gallery
# Open artifacts/gallery.html in a browser; it needs no server.
# Export and independently replay the public signed witness:
node src/cli.mjs --witness artifacts/public-witness.json
node src/cli.mjs --replay artifacts/public-witness.json
```

P1 includes real signature verification, a separate Node crypto cross-check,
tampered output, valid signatures for wrong requests/models, and unsupported
claims. Fixtures are newly authored synthetic data. Demo signing keys are
ephemeral and are never written to disk.

Read the [profile and claim matrix](docs/profile.md). The signed payload is a
public credential; raw private input is absent, but hashes do not provide privacy
for low entropy inputs. The caller supplies the expected context, clock and
pinned issuer keys. A compromised trusted issuer can sign false statements.

## Delivery state

The offline gallery displays fixed expected and actual outcomes and the complete
public witness/rejection reasons. UI and CLI call the same verifier. Replaying
the exported witness uses a fixed historical fixture time, not today's time or
an online identity lookup. Synthetic signatures change between generations;
replaying an exported witness preserves its exact bytes and outcomes.

P0–P2 are implemented locally. Reusable adapters, AI evaluation, hardening and
independent consumption have separate gates; see [phase status](docs/phases.md).
CI uploads the exact tested commit's HTML, JSON and public-witness artifacts.
This is a preview from source, not a published package or production service.

## License

MIT. See [LICENSE](LICENSE); `jose` is separately MIT licensed.
