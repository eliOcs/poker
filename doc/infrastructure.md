# Infrastructure

## Philosophy

Single instance, vertical scaling. One server, one process — no clustering, no load balancers, no distributed systems. SQLite for persistence, files stored directly on the instance disk. Scale the machine up, not out. Complexity costs more than hardware.

## Server

- **Provider**: AWS (eu-central-1)
- **Instance**: ARM64 (Graviton)
- **Domain**: plutonpoker.com
- **SSL**: Let's Encrypt via Kamal proxy

## Storage

- **Database**: SQLite — single-file, zero-config, embedded in the application process
- **Files**: Stored directly on the instance disk (hand histories, etc.)
- **No external services**: No S3, no managed databases, no caches — everything lives on the single server

## Deployment

Deployment uses [Kamal](https://kamal-deploy.org/) for zero-downtime deploys with Docker containers pushed to AWS ECR.

### Configuration Files

```
config/deploy.yml    # Kamal configuration
.kamal/secrets       # Registry credentials (not committed)
Dockerfile           # Container build
```

### Deploy Commands

```bash
kamal deploy         # Full deploy (build, push, deploy)
kamal redeploy       # Deploy without rebuilding
kamal rollback       # Rollback to previous version
```

### Logs & Debugging

```bash
kamal app logs              # View application logs
kamal app logs -f           # Follow logs
kamal app exec -i 'sh'      # Shell into container
kamal proxy logs            # View proxy logs
```

### Infrastructure Management

```bash
kamal setup          # First-time server setup
kamal proxy reboot   # Restart proxy (SSL issues)
kamal app boot       # Start app without deploying
```

### Secrets

The `.kamal/secrets` file generates the ECR password:

```bash
KAMAL_REGISTRY_PASSWORD=$(aws ecr get-login-password --region eu-central-1 --profile personal)
```

ECR tokens expire after 12 hours. If deploy fails with auth errors, the token has expired.
