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

## Consume a receipt

```sh
node examples/consume-receipt.mjs
```

The [versioned consumer boundary](docs/consumer-contract.md) keeps payment
observations, missing/failed output, bound signed output and an offline permission
check separate. It uses synthetic uppercase text, not a model or GPU. G6-owned
fixtures are not a live integration or a replacement for G2/G3 enforcement.
Current G2 trace v1.0 does not support this cryptographic receipt type; the adapter
reports that incompatibility explicitly and preserves the original proof type.

`verifyOnce` adds [process-local replay handling](docs/hardening.md) to the
stateless verifier. Expiry, domain, nonce, rotation and local revocation have
separate negative cases. The in-memory replay store is lost on restart and does
not protect multiple processes. The [AI comparison](docs/ai-evaluation.md) remains
deferred; its explanation guard and scorer tests are not model evaluation.

## Delivery state

The offline gallery displays fixed expected and actual outcomes and the complete
public witness/rejection reasons. UI and CLI call the same verifier. Replaying
the exported witness uses a fixed historical fixture time, not today's time or
an online identity lookup. Synthetic signatures change between generations;
replaying an exported witness preserves its exact bytes and outcomes.

P0–P3 and the bounded P5 hardening are implemented; see the precise
[phase evidence and limits](docs/phases.md). P4 empirical AI comparison and P6
independent consumption are deferred. Only one VC profile is implemented.
Hosted CI is now prohibited by owner instruction; use local tests only. The old
workflow is archived outside the runnable workflow directory. Earlier CI links
and downloadable artifacts are historical evidence for their named commits;
see the [current CI policy](docs/ci-policy.md).
This is a preview from source, not a published package or production service.

Small reproducible boundary cases are welcome; see [CONTRIBUTING](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE); `jose` is separately MIT licensed.
