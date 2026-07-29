#!/bin/bash
# Fourdoor AI Growth Engine - AWS Deployment Script
# This script automates the deployment to AWS infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${PROJECT_NAME:-fourdoor-ai}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check EB CLI
    if ! command -v eb &> /dev/null; then
        log_warn "EB CLI is not installed. You may need it for Elastic Beanstalk deployments."
        log_warn "Install with: pip install awsebcli"
    fi
    
    log_info "Prerequisites check passed!"
}

deploy_infrastructure() {
    log_info "Deploying AWS infrastructure using CloudFormation..."
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
        log_info "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://aws/cloudformation/main-stack.yaml \
            --parameters \
                ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
                ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
                ParameterKey=DBMasterUsername,ParameterValue="${DB_USERNAME:-fourdoor_admin}" \
                ParameterKey=DBMasterPassword,ParameterValue="$DB_PASSWORD" \
            --capabilities CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION" || {
                if [ $? -eq 254 ]; then
                    log_info "No updates to apply."
                else
                    log_error "Failed to update stack"
                    exit 1
                fi
            }
    else
        log_info "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://aws/cloudformation/main-stack.yaml \
            --parameters \
                ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
                ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
                ParameterKey=DBMasterUsername,ParameterValue="${DB_USERNAME:-fourdoor_admin}" \
                ParameterKey=DBMasterPassword,ParameterValue="$DB_PASSWORD" \
            --capabilities CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION"
    fi
    
    log_info "Waiting for stack to complete..."
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" 2>/dev/null || \
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$AWS_REGION" 2>/dev/null
    
    log_info "Infrastructure deployment complete!"
}

get_stack_outputs() {
    log_info "Retrieving stack outputs..."
    
    AURORA_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='AuroraClusterEndpoint'].OutputValue" \
        --output text)
    
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='UploadsBucketName'].OutputValue" \
        --output text)
    
    log_info "Aurora Endpoint: $AURORA_ENDPOINT"
    log_info "S3 Bucket: $S3_BUCKET"
    
    export AURORA_ENDPOINT
    export S3_BUCKET
}

run_migrations() {
    log_info "Running database migrations..."
    
    # This requires the backend to be deployed or run locally with access to Aurora
    cd backend
    DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${AURORA_ENDPOINT}:5432/fourdoor_db" \
    DATABASE_SSL=true \
    npm run migrate
    cd ..
    
    log_info "Database migrations complete!"
}

deploy_backend() {
    log_info "Deploying backend to Elastic Beanstalk..."
    
    cd backend
    
    # Initialize EB if needed
    if [ ! -f ".elasticbeanstalk/config.yml" ]; then
        log_info "Initializing Elastic Beanstalk..."
        eb init -p "Node.js 22 running on 64bit Amazon Linux 2023" \
            --region "$AWS_REGION" \
            "$PROJECT_NAME-backend"
    fi
    
    # Set environment variables
    eb setenv \
        NODE_ENV=production \
        DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${AURORA_ENDPOINT}:5432/fourdoor_db" \
        DATABASE_SSL=true \
        AWS_REGION="$AWS_REGION" \
        AWS_S3_BUCKET="$S3_BUCKET" \
        JWT_SECRET="$JWT_SECRET" \
        CORS_ORIGIN="$FRONTEND_URL"
    
    # Deploy
    eb deploy "${PROJECT_NAME}-api-${ENVIRONMENT}" --staged
    
    cd ..
    
    log_info "Backend deployment complete!"
}

deploy_frontend() {
    log_info "Deploying frontend to Elastic Beanstalk..."
    
    cd frontend
    
    # Build the frontend
    log_info "Building frontend..."
    NEXT_PUBLIC_API_URL="$BACKEND_URL" npm run build
    
    # Initialize EB if needed
    if [ ! -f ".elasticbeanstalk/config.yml" ]; then
        log_info "Initializing Elastic Beanstalk..."
        eb init -p "Node.js 22 running on 64bit Amazon Linux 2023" \
            --region "$AWS_REGION" \
            "$PROJECT_NAME-frontend"
    fi
    
    # Set environment variables
    eb setenv \
        NODE_ENV=production \
        NEXT_PUBLIC_API_URL="$BACKEND_URL"
    
    # Deploy
    eb deploy "${PROJECT_NAME}-web-${ENVIRONMENT}" --staged
    
    cd ..
    
    log_info "Frontend deployment complete!"
}

show_deployment_info() {
    log_info "========================================="
    log_info "Deployment Complete!"
    log_info "========================================="
    log_info ""
    log_info "Infrastructure:"
    log_info "  Aurora PostgreSQL: $AURORA_ENDPOINT"
    log_info "  S3 Bucket: $S3_BUCKET"
    log_info ""
    log_info "Applications:"
    log_info "  Backend URL: $BACKEND_URL"
    log_info "  Frontend URL: $FRONTEND_URL"
    log_info ""
    log_info "Next Steps:"
    log_info "  1. Configure custom domains in Route 53"
    log_info "  2. Set up SSL certificates in ACM"
    log_info "  3. Update DNS records"
    log_info "  4. Configure CloudWatch alarms"
    log_info ""
}

# Main execution
main() {
    log_info "Starting Fourdoor AI Growth Engine deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    
    # Validate required environment variables
    if [ -z "$DB_PASSWORD" ]; then
        log_error "DB_PASSWORD environment variable is required"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET environment variable is required"
        exit 1
    fi
    
    check_prerequisites
    
    case "${1:-all}" in
        infra)
            deploy_infrastructure
            get_stack_outputs
            ;;
        migrate)
            get_stack_outputs
            run_migrations
            ;;
        backend)
            get_stack_outputs
            deploy_backend
            ;;
        frontend)
            get_stack_outputs
            deploy_frontend
            ;;
        all)
            deploy_infrastructure
            get_stack_outputs
            run_migrations
            deploy_backend
            deploy_frontend
            show_deployment_info
            ;;
        *)
            echo "Usage: $0 {infra|migrate|backend|frontend|all}"
            exit 1
            ;;
    esac
}

main "$@"
