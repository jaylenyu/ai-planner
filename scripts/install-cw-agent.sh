#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
CloudWatch agent setup placeholder

1. Install the CloudWatch agent on the EC2 host.
2. Configure log groups:
   - /ai-planner/backend
   - /ai-planner/frontend
3. Point the Docker log driver to awslogs in the deployment compose file.
4. Grant the instance role logs:FilterLogEvents, logs:StartQuery, ce:GetCostAndUsage.
EOF
