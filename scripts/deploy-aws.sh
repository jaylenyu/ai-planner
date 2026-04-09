#!/bin/bash

set -e

echo "=========================================="
echo "AI Travel Planner - AWS Deployment Script"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="ap-northeast-2"
INSTANCE_TYPE="t3.nano"
DB_INSTANCE_CLASS="db.t3.micro"
PROJECT_NAME="ai-planner"
DOMAIN="date-planner.us"
EMAIL="admin@date-planner.us"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if required tools are installed
for tool in aws docker docker-compose; do
    if ! command -v $tool &> /dev/null; then
        echo -e "${RED}$tool is not installed. Please install it first.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}All required tools are installed.${NC}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
echo "AWS Account ID: $ACCOUNT_ID"

# ============================================
# Step 1: VPC and Network Setup
# ============================================
echo -e "${YELLOW}Step 1: Setting up VPC and Network...${NC}"

# Check if VPC already exists (by tag or use default VPC)
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT_NAME}-vpc" --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
    # Use existing default VPC if no tagged VPC found
    VPC_ID=$(aws ec2 describe-vpcs --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")
    if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
        echo "Using existing VPC: $VPC_ID"
    else
        echo "Creating new VPC..."
        VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION --query 'Vpc.VpcId' --output text)
        aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=${PROJECT_NAME}-vpc
        echo "VPC created: $VPC_ID"
    fi
else
    echo "VPC already exists: $VPC_ID"
fi

# Validate VPC_ID
if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
    echo "ERROR: Cannot determine VPC ID"
    exit 1
fi

# Create Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$VPC_ID" --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null || echo "")

if [ -z "$IGW_ID" ] || [ "$IGW_ID" = "None" ]; then
    echo "Creating Internet Gateway..."
    IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
    aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
    aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=${PROJECT_NAME}-igw
    echo "Internet Gateway created: $IGW_ID"
else
    echo "Internet Gateway already exists: $IGW_ID"
fi

# Validate IGW_ID
if [ -z "$IGW_ID" ] || [ "$IGW_ID" = "None" ]; then
    echo "ERROR: Cannot determine Internet Gateway ID"
    exit 1
fi

# Create Public Subnet
SUBNET_A_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=availability-zone,Values=${REGION}a" --query 'Subnets[0].SubnetId' --output text 2>/dev/null || echo "")

if [ -z "$SUBNET_A_ID" ] || [ "$SUBNET_A_ID" = "None" ]; then
    echo "Creating public subnet in ${REGION}a..."
    SUBNET_A_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${REGION}a --query 'Subnet.SubnetId' --output text)
    aws ec2 create-tags --resources $SUBNET_A_ID --tags Key=Name,Value=${PROJECT_NAME}-subnet-public-a
    echo "Subnet created: $SUBNET_A_ID"
else
    echo "Subnet already exists: $SUBNET_A_ID"
fi

# Validate SUBNET_A_ID
if [ -z "$SUBNET_A_ID" ] || [ "$SUBNET_A_ID" = "None" ]; then
    echo "ERROR: Cannot determine Subnet ID"
    exit 1
fi

# Create and configure route table
ROUTE_TABLE_ID=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC_ID" --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null || true)

if [ -z "$ROUTE_TABLE_ID" ]; then
    echo "Creating route table..."
    ROUTE_TABLE_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
    aws ec2 create-tags --resources $ROUTE_TABLE_ID --tags Key=Name,Value=${PROJECT_NAME}-rt
fi

# Associate route table with subnet
aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $SUBNET_A_ID 2>/dev/null || true

# Add default route
aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID 2>/dev/null || true

echo "Network setup completed!"

# ============================================
# Step 2: Security Groups
# ============================================
echo -e "${YELLOW}Step 2: Setting up Security Groups...${NC}"

# EC2 Security Group
SG_EC2_NAME="${PROJECT_NAME}-ec2-sg"
SG_EC2_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_EC2_NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")

if [ -z "$SG_EC2_ID" ] || [ "$SG_EC2_ID" = "None" ]; then
    echo "Creating EC2 security group..."
    SG_EC2_ID=$(aws ec2 create-security-group --group-name $SG_EC2_NAME --description "Security group for EC2" --vpc-id $VPC_ID --query 'GroupId' --output text)
    
    # Allow SSH (allow from anywhere for now - restrict in production)
    aws ec2 authorize-security-group-ingress --group-id $SG_EC2_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
    
    # Allow HTTP/HTTPS
    aws ec2 authorize-security-group-ingress --group-id $SG_EC2_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_EC2_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
    
    echo "EC2 Security Group created: $SG_EC2_ID"
else
    echo "EC2 Security Group already exists: $SG_EC2_ID"
fi

# RDS Security Group
SG_RDS_NAME="${PROJECT_NAME}-rds-sg"
SG_RDS_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_RDS_NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")

if [ -z "$SG_RDS_ID" ] || [ "$SG_RDS_ID" = "None" ]; then
    echo "Creating RDS security group..."
    SG_RDS_ID=$(aws ec2 create-security-group --group-name $SG_RDS_NAME --description "Security group for RDS" --vpc-id $VPC_ID --query 'GroupId' --output text)
    
    # Allow PostgreSQL from EC2 security group
    aws ec2 authorize-security-group-ingress --group-id $SG_RDS_ID --protocol tcp --port 5432 --source-group $SG_EC2_ID
    
    echo "RDS Security Group created: $SG_RDS_ID"
else
    echo "RDS Security Group already exists: $SG_RDS_ID"
fi

# ============================================
# Step 3: Key Pair
# ============================================
echo -e "${YELLOW}Step 3: Setting up Key Pair...${NC}"

KEY_NAME="${PROJECT_NAME}-key"
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME &> /dev/null; then
    echo "Creating key pair..."
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ~/${KEY_NAME}.pem
    chmod 400 ~/${KEY_NAME}.pem
    echo "Key pair saved to ~/${KEY_NAME}.pem"
else
    echo "Key pair already exists"
fi

# ============================================
# Step 4: Launch EC2 Instance
# ============================================
echo -e "${YELLOW}Step 4: Launching EC2 Instance...${NC}"

# Get latest Ubuntu 24.04 AMI (x86 for t3.nano)
AMI_ID="ami-0c55b159cbfafe1f0"  # Ubuntu 24.04 LTS x86_64
INSTANCE_TYPE="t3.nano"

INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=${PROJECT_NAME}-ec2" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "")

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo "Launching EC2 instance (t3.nano - $4.20/month)..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_EC2_ID \
        --subnet-id $SUBNET_A_ID \
        --associate-public-ip-address \
        --user-data "#!/bin/bash
apt update
apt upgrade -y
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx curl wget git
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu
mkdir -p /opt/${PROJECT_NAME}
chown -R ubuntu:ubuntu /opt/${PROJECT_NAME}
swapoff -a
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-ec2}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    echo "EC2 Instance created: $INSTANCE_ID"
else
    echo "EC2 Instance already exists: $INSTANCE_ID"
fi

# Validate INSTANCE_ID
if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo "ERROR: Cannot determine Instance ID"
    exit 1
fi

# ============================================
# Step 5: Allocate and Associate Elastic IP
# ============================================
echo -e "${YELLOW}Step 5: Setting up Elastic IP...${NC}"

EIP_ALLOC_ID=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=${PROJECT_NAME}-eip" --query 'Addresses[0].AllocationId' --output text 2>/dev/null || echo "")

if [ -z "$EIP_ALLOC_ID" ] || [ "$EIP_ALLOC_ID" = "None" ]; then
    echo "Allocating Elastic IP..."
    EIP_ALLOC_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
    aws ec2 create-tags --resources $EIP_ALLOC_ID --tags Key=Name,Value=${PROJECT_NAME}-eip
    echo "Elastic IP allocated: $EIP_ALLOC_ID"
fi

# Check if EIP is already associated
if [ -n "$EIP_ALLOC_ID" ] && [ "$EIP_ALLOC_ID" != "None" ]; then
    EIP_ASSOC_ID=$(aws ec2 describe-addresses --allocation-ids $EIP_ALLOC_ID --query 'Addresses[0].AssociationId' --output text 2>/dev/null || echo "")
    
    if [ -z "$EIP_ASSOC_ID" ] || [ "$EIP_ASSOC_ID" = "None" ]; then
        echo "Associating Elastic IP with EC2..."
        aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $EIP_ALLOC_ID
    fi
    
    EIP=$(aws ec2 describe-addresses --allocation-ids $EIP_ALLOC_ID --query 'Addresses[0].PublicIp' --output text)
    echo "Elastic IP: $EIP"
fi

# ============================================
# Step 6: RDS Setup
# ============================================
echo -e "${YELLOW}Step 6: Setting up RDS PostgreSQL...${NC}"

# Create DB Subnet Group
DB_SUBNET_GROUP="${PROJECT_NAME}-db-subnet"
if ! aws rds describe-db-subnet-groups --db-subnet-group-name $DB_SUBNET_GROUP &> /dev/null; then
    echo "Creating DB subnet group..."
    aws rds create-db-subnet-group \
        --db-subnet-group-name $DB_SUBNET_GROUP \
        --db-subnet-group-description "Subnet group for ${PROJECT_NAME} RDS" \
        --subnet-ids $SUBNET_A_ID \
        --region $REGION
fi

DB_INSTANCE_IDENTIFIER="${PROJECT_NAME}-db"
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || true)

if [ -z "$DB_ENDPOINT" ]; then
    echo "Creating RDS instance (db.t4g.micro - Free Tier)..."
    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
    
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine postgres \
        --engine-version 16.3 \
        --master-username planner_admin \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --db-subnet-group-name $DB_SUBNET_GROUP \
        --vpc-security-group-ids $SG_RDS_ID \
        --availability-zone ${REGION}a \
        --backup-retention-period 7 \
        --no-multi-az \
        --publicly-accessible false \
        --region $REGION \
        --tags Key=Name,Value=${PROJECT_NAME}-db
    
    echo "Waiting for RDS instance to be available..."
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $REGION
    
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text)
    
    echo -e "${GREEN}RDS created successfully!${NC}"
    echo "Endpoint: $DB_ENDPOINT"
    echo "Master Password: $DB_PASSWORD"
    echo -e "${YELLOW}IMPORTANT: Save this password! It won't be shown again.${NC}"
else
    echo "RDS already exists: $DB_ENDPOINT"
fi

# ============================================
# Step 7: SSL Certificate
# ============================================
echo -e "${YELLOW}Step 7: SSL Certificate Setup...${NC}"

echo "Note: SSL certificate will be issued after DNS is configured."
echo "Run: ssh ubuntu@$EIP 'sudo certbot certonly --standalone -d $DOMAIN'"

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo "EC2 Instance: $INSTANCE_ID"
echo "Elastic IP: $EIP"
echo "RDS Endpoint: $DB_ENDPOINT"
echo ""
echo "Next steps:"
echo "1. Configure DNS: Point $DOMAIN to $EIP"
echo "2. SSH to instance: ssh -i ~/${KEY_NAME}.pem ubuntu@$EIP"
echo "3. Clone repository and configure environment"
echo "4. Run: cd /opt/${PROJECT_NAME} && docker-compose up -d"
echo ""
echo -e "${YELLOW}Estimated monthly cost: ~$3.50 (EC2) + $0 (RDS Free Tier)${NC}"
