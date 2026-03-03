terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# Adopt default VPC with dual-stack (IPv6 is free)
resource "aws_default_vpc" "default" {
  assign_generated_ipv6_cidr_block = true
}

# Adopt default subnet with IPv6 CIDR
resource "aws_default_subnet" "default" {
  availability_zone = "${var.aws_region}a"

  assign_ipv6_address_on_creation = true
  ipv6_cidr_block                 = cidrsubnet(aws_default_vpc.default.ipv6_cidr_block, 8, 0)
}

# Internet gateway (default VPC already has one)
data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [aws_default_vpc.default.id]
  }
}

# Main route table
data "aws_route_table" "main" {
  vpc_id = aws_default_vpc.default.id
  filter {
    name   = "association.main"
    values = ["true"]
  }
}

# IPv6 route via internet gateway
resource "aws_route" "ipv6_default" {
  route_table_id              = data.aws_route_table.main.id
  destination_ipv6_cidr_block = "::/0"
  gateway_id                  = data.aws_internet_gateway.default.id
}

# ECR Repository
resource "aws_ecr_repository" "poker" {
  name                 = "poker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }
}

# ECR Lifecycle Policy — keep only the latest 10 images
resource "aws_ecr_lifecycle_policy" "poker" {
  repository = aws_ecr_repository.poker.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the latest 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# Security Group
resource "aws_security_group" "poker" {
  name        = "poker-sg"
  description = "Poker app security group"
  vpc_id      = aws_default_vpc.default.id

  # SSH
  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "SSH access"
  }

  # HTTP (for Let's Encrypt ACME challenge)
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "HTTP access"
  }

  # HTTPS
  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "HTTPS access"
  }

  # Outbound (allow all)
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "poker-sg"
  }
}

# SSH Key Pair
resource "aws_key_pair" "poker" {
  key_name   = "poker-key"
  public_key = file(var.ssh_public_key_path)
}

# EC2 Instance (Graviton t4g.micro)
# AMI: Ubuntu 24.04 ARM64 (eu-central-1, 2026-02-18)
resource "aws_instance" "poker" {
  ami                    = "ami-052b310a8f0d76968"
  instance_type          = "t4g.micro"
  key_name               = aws_key_pair.poker.key_name
  vpc_security_group_ids = [aws_security_group.poker.id]
  subnet_id              = aws_default_subnet.default.id
  ipv6_address_count     = 1

  user_data = <<-EOF
    #!/bin/bash
    DEVICE=/dev/$(lsblk -dno NAME,TYPE | awk '$2 == "disk" {print $1}' | grep -v nvme0n1)
    MOUNT=/opt/poker/data
    # Only format if not already formatted
    if ! blkid "$DEVICE"; then
      mkfs.ext4 "$DEVICE"
    fi
    mkdir -p "$MOUNT"
    chown 1001:1001 "$MOUNT"
    if ! grep -q "$MOUNT" /etc/fstab; then
      echo "$DEVICE $MOUNT ext4 defaults,nofail 0 2" >> /etc/fstab
    fi
    mount -a
  EOF

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name = "poker-server"
  }
}

# Persistent data volume (survives instance replacement)
resource "aws_ebs_volume" "data" {
  availability_zone = aws_default_subnet.default.availability_zone
  size              = 5
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "poker-data"
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.poker.id
}

# Elastic IP
resource "aws_eip" "poker" {
  instance = aws_instance.poker.id
  domain   = "vpc"

  tags = {
    Name = "poker-ip"
  }
}

# Route53 A Record (apex domain, IPv4)
resource "aws_route53_record" "poker" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"
  ttl     = 300
  records = [aws_eip.poker.public_ip]
}

# Route53 AAAA Record (apex domain, IPv6)
resource "aws_route53_record" "poker_ipv6" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "AAAA"
  ttl     = 300
  records = [aws_instance.poker.ipv6_addresses[0]]
}

# GitHub OIDC Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["ffffffffffffffffffffffffffffffffffffffff"]
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "poker-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
      }
    }]
  })
}

# ECR Policy for GitHub Actions
resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "ecr-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = aws_ecr_repository.poker.arn
      }
    ]
  })
}
