# Infrastructure

One ARM64 (Graviton) EC2 instance in `eu-central-1` runs one container at
[plutonpoker.com](https://plutonpoker.com). There is no load balancer, no
managed database and no cluster. The app keeps live games in memory and its
data on local disk ([why](../README.md#principles)). Hardware is cheaper than
the complexity of running more than one instance.

| Concern       | Choice                                                    | Defined in                                  |
| ------------- | --------------------------------------------------------- | ------------------------------------------- |
| AWS resources | Terraform                                                 | `terraform/`                                |
| Deploys       | [Kamal](https://kamal-deploy.org/), image in ECR          | `config/deploy.yml`, `Dockerfile`           |
| TLS           | Let's Encrypt, terminated by kamal-proxy                  | `config/deploy.yml`                         |
| Email         | AWS SES for sign-in links                                 | `terraform/main.tf`, `src/backend/email.js` |
| CI / CD       | GitHub Actions: checks on push, deploy on manual dispatch | `.github/workflows/`                        |

## Provisioning

Terraform manages the instance, an Elastic IP, Route 53 records (IPv4 and
IPv6), the ECR repository, the SES domain identity (DKIM and a custom MAIL
FROM domain), and IAM roles. One of those roles lets GitHub Actions deploy
through OIDC, so the repository stores no long-lived AWS keys. Copy
`terraform.tfvars.example` to `terraform.tfvars` before applying. The state
file is local and ignored by Git.

**Data** lives on a separate EBS volume, not the root disk. That separation
lets the instance be replaced without touching the data. The volume is mounted
at `/opt/poker/data`, which the container sees as `/app/data`. Docker waits for
the mount, so the app never starts against an empty directory. Data Lifecycle
Manager takes weekly snapshots of the volume and keeps the last four.

**Monitoring.** A scheduled Lambda requests the site over HTTPS. When the site
goes down or recovers, an email goes out through SNS. CloudWatch alarms
(collected by the CloudWatch agent) also watch instance status checks, memory,
disk, CPU and EBS saturation. These alarms have no actions configured, so they
appear only in the CloudWatch console.

## Deploying

Deploys normally run from the **Deploy to Production** workflow, which builds
the ARM64 image, pushes it to ECR and runs `kamal deploy`. To deploy from a
workstation instead, you need Kamal, the AWS CLI with the `personal` profile,
and the server's SSH key (`~/.ssh/poker_ed25519`):

```bash
kamal deploy          # build, push, deploy with zero downtime
kamal rollback        # previous version
kamal app logs -f     # follow application logs
kamal app exec -i sh  # shell in the running container
```

`.kamal/secrets` fetches a registry password with `aws ecr get-login-password`.
ECR passwords expire after 12 hours, so an authentication error usually means
yours has expired.

Logs are capped at about 1 GB per container (`json-file`, ten 100 MB files) so
that they cannot fill the disk. Logging options apply only when a container is
created, so a change to them takes effect on the next deploy. To debug a hand
from production, use `npm run debug:prod:game` or the `debug-production-hand`
skill in `.claude/skills/`.

## Configuration

Environment variables, read at startup:

| Variable                                          | Purpose                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `PORT`, `HOST`                                    | Listen address                                         |
| `APP_ORIGIN`, `DOMAIN`                            | Public origin, used in sign-in links                   |
| `DATA_DIR`                                        | SQLite and history files (default `data`)              |
| `LOG_FORMAT`, `LOG_LEVEL`                         | `json` in production                                   |
| `TRUSTED_PROXY_CIDRS`                             | Proxies whose `X-Forwarded-For` is trusted             |
| `AWS_REGION`, `SES_FROM_EMAIL`                    | Email delivery                                         |
| `EMAIL_SINK_DIR`                                  | Write emails to files instead of SES (local and tests) |
| `EMAIL_SIGN_IN_TTL_MINUTES`                       | Sign-in link lifetime                                  |
| `GAME_INACTIVITY_MS`, `GAME_EVICTION_INTERVAL_MS` | When idle games leave memory                           |
| `RNG_SEED`, `TIMER_SPEED`                         | Deterministic deals and faster clocks, for tests only  |
