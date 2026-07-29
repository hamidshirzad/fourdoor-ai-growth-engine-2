#!/bin/bash
# Fourdoor AI Growth Engine - Elastic Beanstalk Environment Setup Script
# Creates the Elastic Beanstalk applications and environments

set -e

# Configuration
PROJECT_NAME="${PROJECT_NAME:-fourdoor-ai}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"

log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1"
}

# Create Backend Application
create_backend_app() {
    log_info "Creating backend Elastic Beanstalk application..."
    
    # Check if application exists
    if aws elasticbeanstalk describe-applications \
        --application-names "${PROJECT_NAME}-backend" \
        --region "$AWS_REGION" &> /dev/null; then
        log_info "Backend application already exists"
    else
        aws elasticbeanstalk create-application \
            --application-name "${PROJECT_NAME}-backend" \
            --description "Fourdoor AI Growth Engine - Backend API" \
            --region "$AWS_REGION"
        log_info "Backend application created"
    fi
}

# Create Frontend Application
create_frontend_app() {
    log_info "Creating frontend Elastic Beanstalk application..."
    
    if aws elasticbeanstalk describe-applications \
        --application-names "${PROJECT_NAME}-frontend" \
        --region "$AWS_REGION" &> /dev/null; then
        log_info "Frontend application already exists"
    else
        aws elasticbeanstalk create-application \
            --application-name "${PROJECT_NAME}-frontend" \
            --description "Fourdoor AI Growth Engine - Frontend Web App" \
            --region "$AWS_REGION"
        log_info "Frontend application created"
    fi
}

# Create Backend Environment
create_backend_env() {
    local env_name="${PROJECT_NAME}-api-${ENVIRONMENT}"
    
    log_info "Creating backend environment: $env_name"
    
    # Get stack outputs for VPC, subnets, security groups
    VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='VPCId'].OutputValue" \
        --output text)
    
    PUBLIC_SUBNETS=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet1Id'].OutputValue" \
        --output text),$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet2Id'].OutputValue" \
        --output text)
    
    APP_SG=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='AppSecurityGroupId'].OutputValue" \
        --output text)
    
    INSTANCE_PROFILE=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='EBInstanceProfileArn'].OutputValue" \
        --output text)
    
    # Check if environment exists
    if aws elasticbeanstalk describe-environments \
        --application-name "${PROJECT_NAME}-backend" \
        --environment-names "$env_name" \
        --region "$AWS_REGION" \
        --query "Environments[?Status!='Terminated']" \
        --output text | grep -q "$env_name"; then
        log_info "Backend environment already exists"
    else
        aws elasticbeanstalk create-environment \
            --application-name "${PROJECT_NAME}-backend" \
            --environment-name "$env_name" \
            --solution-stack-name "64bit Amazon Linux 2023 v6.1.0 running Node.js 22" \
            --option-settings \
                Namespace=aws:ec2:vpc,OptionName=VPCId,Value="$VPC_ID" \
                Namespace=aws:ec2:vpc,OptionName=Subnets,Value="$PUBLIC_SUBNETS" \
                Namespace=aws:ec2:vpc,OptionName=ELBSubnets,Value="$PUBLIC_SUBNETS" \
                Namespace=aws:autoscaling:launchconfiguration,OptionName=SecurityGroups,Value="$APP_SG" \
                Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value="$INSTANCE_PROFILE" \
                Namespace=aws:elasticbeanstalk:environment,OptionName=LoadBalancerType,Value=application \
                Namespace=aws:autoscaling:asg,OptionName=MinSize,Value=1 \
                Namespace=aws:autoscaling:asg,OptionName=MaxSize,Value=5 \
            --region "$AWS_REGION"
        log_info "Backend environment created"
    fi
}

# Create Frontend Environment
create_frontend_env() {
    local env_name="${PROJECT_NAME}-web-${ENVIRONMENT}"
    
    log_info "Creating frontend environment: $env_name"
    
    # Get stack outputs
    VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='VPCId'].OutputValue" \
        --output text)
    
    PUBLIC_SUBNETS=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet1Id'].OutputValue" \
        --output text),$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='PublicSubnet2Id'].OutputValue" \
        --output text)
    
    APP_SG=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='AppSecurityGroupId'].OutputValue" \
        --output text)
    
    INSTANCE_PROFILE=$(aws cloudformation describe-stacks \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='EBInstanceProfileArn'].OutputValue" \
        --output text)
    
    # Check if environment exists
    if aws elasticbeanstalk describe-environments \
        --application-name "${PROJECT_NAME}-frontend" \
        --environment-names "$env_name" \
        --region "$AWS_REGION" \
        --query "Environments[?Status!='Terminated']" \
        --output text | grep -q "$env_name"; then
        log_info "Frontend environment already exists"
    else
        aws elasticbeanstalk create-environment \
            --application-name "${PROJECT_NAME}-frontend" \
            --environment-name "$env_name" \
            --solution-stack-name "64bit Amazon Linux 2023 v6.1.0 running Node.js 22" \
            --option-settings \
                Namespace=aws:ec2:vpc,OptionName=VPCId,Value="$VPC_ID" \
                Namespace=aws:ec2:vpc,OptionName=Subnets,Value="$PUBLIC_SUBNETS" \
                Namespace=aws:ec2:vpc,OptionName=ELBSubnets,Value="$PUBLIC_SUBNETS" \
                Namespace=aws:autoscaling:launchconfiguration,OptionName=SecurityGroups,Value="$APP_SG" \
                Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value="$INSTANCE_PROFILE" \
                Namespace=aws:elasticbeanstalk:environment,OptionName=LoadBalancerType,Value=application \
                Namespace=aws:autoscaling:asg,OptionName=MinSize,Value=1 \
                Namespace=aws:autoscaling:asg,OptionName=MaxSize,Value=3 \
            --region "$AWS_REGION"
        log_info "Frontend environment created"
    fi
}

main() {
    log_info "Setting up Elastic Beanstalk environments..."
    log_info "Project: $PROJECT_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    
    create_backend_app
    create_frontend_app
    create_backend_env
    create_frontend_env
    
    log_info "Elastic Beanstalk setup complete!"
}

main
