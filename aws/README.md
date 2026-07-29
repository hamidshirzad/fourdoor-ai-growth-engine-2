# AWS Deployment Guide for Fourdoor AI Growth Engine

This guide covers deploying the Fourdoor AI Growth Engine to AWS infrastructure using Aurora PostgreSQL, Elastic Beanstalk, and S3.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    VPC (10.0.0.0/16)                      │   │
│  │                                                           │   │
│  │  ┌─────────────────┐       ┌─────────────────┐           │   │
│  │  │ Public Subnet 1 │       │ Public Subnet 2 │           │   │
│  │  │   (10.0.1.0/24) │       │   (10.0.2.0/24) │           │   │
│  │  │                 │       │                 │           │   │
│  │  │  ┌───────────┐  │       │  ┌───────────┐  │           │   │
│  │  │  │    ALB    │◄─┼───────┼──│  Internet │  │           │   │
│  │  │  └─────┬─────┘  │       │  │  Gateway  │  │           │   │
│  │  │        │        │       │  └───────────┘  │           │   │
│  │  │  ┌─────▼─────┐  │       │  ┌───────────┐  │           │   │
│  │  │  │  Backend  │  │       │  │  Frontend │  │           │   │
│  │  │  │ (EB/EC2)  │  │       │  │ (EB/EC2)  │  │           │   │
│  │  │  └─────┬─────┘  │       │  └───────────┘  │           │   │
│  │  │        │        │       │                 │           │   │
│  │  └────────┼────────┘       └─────────────────┘           │   │
│  │           │                                               │   │
│  │  ┌────────▼────────┐       ┌─────────────────┐           │   │
│  │  │ Private Subnet 1│       │ Private Subnet 2│           │   │
│  │  │  (10.0.10.0/24) │       │  (10.0.11.0/24) │           │   │
│  │  │                 │       │                 │           │   │
│  │  │ ┌─────────────┐ │       │ ┌─────────────┐ │           │   │
│  │  │ │   Aurora    │◄┼───────┼─│   Aurora    │ │           │   │
│  │  │ │  (Primary)  │ │       │ │  (Replica)  │ │           │   │
│  │  │ └─────────────┘ │       │ └─────────────┘ │           │   │
│  │  └─────────────────┘       └─────────────────┘           │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │      S3      │  │  CloudWatch  │  │   Secrets    │           │
│  │   (Uploads)  │  │    (Logs)    │  │   Manager    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS CLI** - Install and configure with appropriate credentials
   ```bash
   pip install awscli
   aws configure
   ```

2. **EB CLI** (Optional but recommended) - For Elastic Beanstalk deployments
   ```bash
   pip install awsebcli
   ```

3. **Node.js 22+** - For running migrations locally

4. **AWS Account** with permissions for:
   - CloudFormation
   - EC2 / VPC
   - RDS (Aurora)
   - Elastic Beanstalk
   - S3
   - IAM
   - Secrets Manager
   - CloudWatch

## Quick Start

### 1. Configure Environment Variables

```bash
# Copy the example environment file
cp aws/.env.aws.example aws/.env.aws

# Edit with your values
nano aws/.env.aws
```

Required variables:
- `DB_PASSWORD` - Strong password for Aurora (min 16 characters)
- `JWT_SECRET` - Secret for JWT token signing (min 32 characters)
- `AWS_REGION` - Your preferred AWS region

### 2. Deploy Infrastructure

```bash
# Source environment variables
source aws/.env.aws

# Make scripts executable
chmod +x aws/scripts/*.sh

# Deploy all infrastructure
./aws/scripts/deploy.sh all
```

Or deploy step by step:

```bash
# 1. Deploy CloudFormation stack (VPC, Aurora, S3, IAM)
./aws/scripts/deploy.sh infra

# 2. Run database migrations
./aws/scripts/deploy.sh migrate

# 3. Deploy backend to Elastic Beanstalk
./aws/scripts/deploy.sh backend

# 4. Deploy frontend to Elastic Beanstalk
./aws/scripts/deploy.sh frontend
```

## CloudFormation Stack

The main CloudFormation template (`aws/cloudformation/main-stack.yaml`) creates:

| Resource | Description |
|----------|-------------|
| VPC | Virtual Private Cloud with public/private subnets |
| Internet Gateway | For public internet access |
| NAT Gateway | For private subnet outbound traffic |
| Aurora PostgreSQL | Multi-AZ database cluster with 2 instances |
| S3 Bucket | File uploads with versioning and encryption |
| Security Groups | Network security for ALB, App, and Database |
| IAM Roles | Service roles for Elastic Beanstalk and S3 access |
| Secrets Manager | Secure storage for database credentials |
| CloudWatch Log Groups | Application logging |

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Environment | production | Deployment environment |
| ProjectName | fourdoor-ai | Project identifier |
| DBInstanceClass | db.r6g.large | Aurora instance type |
| DBMasterUsername | fourdoor_admin | Database admin username |
| DBMasterPassword | (required) | Database admin password |

## Elastic Beanstalk Configuration

### Backend (.ebextensions)

- **01_nodejs.config**: Node.js runtime configuration, auto-scaling, and health reporting
- **02_database.config**: Database migration hooks

### Frontend (.ebextensions)

- **01_nextjs.config**: Next.js build and deployment settings

### Nginx Configuration

Both applications include custom nginx configurations for:
- Gzip compression
- Security headers
- Optimized proxy settings
- Health check endpoints

## Environment Variables

### Backend (Elastic Beanstalk)

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@aurora-endpoint:5432/fourdoor_db
DATABASE_SSL=true
AWS_REGION=us-east-1
AWS_S3_BUCKET=fourdoor-ai-production-uploads-ACCOUNT_ID
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://app.fourdoor.example.com
```

### Frontend (Elastic Beanstalk)

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.fourdoor.example.com
```

## S3 File Storage

The S3 service provides:
- **File upload** (direct and presigned URLs)
- **File download** (presigned URLs for secure access)
- **File validation** (type and size limits)
- **File listing** (per user)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload single file |
| `/api/upload/multiple` | POST | Upload multiple files |
| `/api/upload/presigned` | POST | Get presigned upload URL |
| `/api/upload/download/:key` | GET | Get presigned download URL |
| `/api/upload/list` | GET | List user files |
| `/api/upload/:key` | DELETE | Delete file |

## Health Checks

### Backend Health Endpoints

- `/health` - Full health check (includes database connectivity)
- `/health/live` - Liveness probe (simple alive check)
- `/health/ready` - Readiness probe (all dependencies ready)

### Frontend Health Endpoint

- `/api/health` - Simple health check

## Monitoring & Logging

### CloudWatch

- Application logs are automatically sent to CloudWatch
- Log retention: 30 days
- Log groups:
  - `/aws/elasticbeanstalk/fourdoor-ai-production-backend`
  - `/aws/elasticbeanstalk/fourdoor-ai-production-frontend`

### Recommended Alarms

1. **High CPU Utilization** (> 80% for 5 minutes)
2. **High Memory Usage** (> 85%)
3. **Database Connection Pool Exhaustion**
4. **5xx Error Rate** (> 1% of requests)
5. **API Response Time** (p99 > 2 seconds)

## Security Best Practices

1. **Secrets Management**
   - Database credentials stored in AWS Secrets Manager
   - Use IAM roles instead of hardcoded credentials

2. **Network Security**
   - Aurora in private subnets (no public access)
   - Security groups restrict traffic appropriately
   - ALB handles SSL termination

3. **Data Encryption**
   - Aurora encryption at rest enabled
   - S3 bucket encryption enabled
   - SSL/TLS for all connections

4. **Access Control**
   - IAM roles with least privilege
   - S3 bucket blocks public access

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify security group allows traffic from app
   - Check DATABASE_URL format
   - Ensure DATABASE_SSL=true

2. **S3 Upload Failed**
   - Verify IAM role has S3 permissions
   - Check bucket name and region

3. **Deployment Stuck**
   - Check Elastic Beanstalk events
   - Review CloudWatch logs
   - Verify instance health

### Useful Commands

```bash
# View EB environment status
eb status

# View EB logs
eb logs

# SSH into instance
eb ssh

# View CloudWatch logs
aws logs get-log-events \
  --log-group-name /aws/elasticbeanstalk/fourdoor-ai-production-backend \
  --log-stream-name your-log-stream
```

## Cost Estimation

| Service | Instance/Config | Estimated Monthly Cost |
|---------|-----------------|------------------------|
| Aurora PostgreSQL | 2x db.r6g.large | ~$400 |
| Elastic Beanstalk (Backend) | t3.small (1-5) | ~$15-75 |
| Elastic Beanstalk (Frontend) | t3.small (1-3) | ~$15-45 |
| NAT Gateway | 1 gateway | ~$35 |
| S3 | 100GB storage | ~$5 |
| Data Transfer | 100GB/month | ~$10 |
| **Total** | | **~$480-570/month** |

*Costs vary by region and usage. Consider using Reserved Instances for production.*

## Cleanup

To delete all resources:

```bash
# Delete Elastic Beanstalk environments
eb terminate fourdoor-ai-api-production --force
eb terminate fourdoor-ai-web-production --force

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name fourdoor-ai-production

# Note: S3 bucket must be emptied before deletion
aws s3 rm s3://fourdoor-ai-production-uploads-ACCOUNT_ID --recursive
```
