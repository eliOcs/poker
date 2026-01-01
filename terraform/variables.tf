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
