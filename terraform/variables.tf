variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "personal"
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
  default     = "plutonpoker.com"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = "Z0547678BYEE9JNW3YM2"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/poker_ed25519.pub"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) for OIDC access"
  type        = string
  default     = "eliOcs/poker"
}

variable "ses_mail_from_subdomain" {
  description = "Subdomain used for SES custom MAIL FROM"
  type        = string
  default     = "mail"
}

variable "ses_dns_ttl" {
  description = "TTL for SES DNS records"
  type        = number
  default     = 600
}
