output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_eip.poker.public_ip
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.poker.repository_url
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.poker.id
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ~/.ssh/poker_ed25519 ubuntu@${aws_eip.poker.public_ip}"
}

output "domain" {
  description = "Domain name"
  value       = var.domain
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}
