locals {
  filesystems = {
    root = {
      path = "/"
    }
    data = {
      path = "/opt/poker/data"
    }
  }

  ebs_volumes = {
    root = {
      volume_id = aws_instance.poker.root_block_device[0].volume_id
    }
    data = {
      volume_id = aws_ebs_volume.data.id
    }
  }
}

resource "aws_ssm_parameter" "cloudwatch_agent_config" {
  name        = "AmazonCloudWatch-poker"
  description = "CloudWatch Agent configuration for the poker server"
  type        = "String"
  value = jsonencode({
    agent = {
      metrics_collection_interval = 60
      run_as_user                 = "root"
    }
    metrics = {
      namespace = "CWAgent"
      append_dimensions = {
        InstanceId = "$${aws:InstanceId}"
      }
      metrics_collected = {
        mem = {
          measurement                 = ["mem_used_percent"]
          metrics_collection_interval = 60
        }
        disk = {
          measurement                 = ["used_percent"]
          metrics_collection_interval = 60
          resources                   = [for filesystem in local.filesystems : filesystem.path]
          drop_device                 = true
        }
      }
    }
  })
}

resource "aws_ssm_association" "install_cloudwatch_agent" {
  association_name = "poker-install-cloudwatch-agent"
  name             = "AWS-ConfigureAWSPackage"

  parameters = {
    action           = "Install"
    name             = "AmazonCloudWatchAgent"
    installationType = "In-place update"
  }

  targets {
    key    = "InstanceIds"
    values = [aws_instance.poker.id]
  }

  wait_for_success_timeout_seconds = 600

  depends_on = [
    aws_iam_role_policy_attachment.poker_ec2_ssm,
    aws_iam_role_policy_attachment.poker_ec2_cloudwatch_agent,
  ]
}

resource "aws_ssm_association" "configure_cloudwatch_agent" {
  association_name = "poker-configure-cloudwatch-agent"
  name             = "AmazonCloudWatch-ManageAgent"

  parameters = {
    action                        = "configure"
    mode                          = "ec2"
    optionalConfigurationSource   = "ssm"
    optionalConfigurationLocation = aws_ssm_parameter.cloudwatch_agent_config.name
    optionalRestart               = "yes"
  }

  targets {
    key    = "InstanceIds"
    values = [aws_instance.poker.id]
  }

  wait_for_success_timeout_seconds = 600

  depends_on = [aws_ssm_association.install_cloudwatch_agent]
}

resource "aws_cloudwatch_metric_alarm" "status_check_failed" {
  alarm_name          = "poker-ec2-status-check-failed"
  alarm_description   = "The poker server failed an EC2 instance or system status check."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.poker.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "missing"
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "poker-high-memory"
  alarm_description   = "Memory utilization was at least 85% for five minutes."
  namespace           = "CWAgent"
  metric_name         = "mem_used_percent"
  dimensions          = { InstanceId = aws_instance.poker.id }
  statistic           = "Average"
  period              = 60
  evaluation_periods  = 5
  datapoints_to_alarm = 5
  threshold           = 85
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "breaching"

  depends_on = [aws_ssm_association.configure_cloudwatch_agent]
}

resource "aws_cloudwatch_metric_alarm" "low_disk_space" {
  for_each = local.filesystems

  alarm_name        = "poker-low-disk-space-${each.key}"
  alarm_description = "Filesystem ${each.value.path} reached 75% usage; intervene before it reaches 80%."
  namespace         = "CWAgent"
  metric_name       = "disk_used_percent"
  dimensions = {
    InstanceId = aws_instance.poker.id
    path       = each.value.path
    fstype     = "ext4"
  }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 75
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "breaching"

  depends_on = [aws_ssm_association.configure_cloudwatch_agent]
}

resource "aws_cloudwatch_metric_alarm" "sustained_cpu" {
  alarm_name          = "poker-sustained-cpu"
  alarm_description   = "Average CPU utilization was at least 80% for 15 minutes."
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.poker.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  threshold           = 80
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "ebs_saturation" {
  for_each = local.ebs_volumes

  alarm_name          = "poker-ebs-saturation-${each.key}"
  alarm_description   = "The ${each.key} EBS volume reached its provisioned IOPS or throughput limit for three minutes."
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "saturation"
    expression  = "MAX([iops, throughput])"
    label       = "EBS saturation"
    return_data = true
  }

  metric_query {
    id = "iops"

    metric {
      namespace   = "AWS/EBS"
      metric_name = "VolumeIOPSExceededCheck"
      dimensions  = { VolumeId = each.value.volume_id }
      period      = 60
      stat        = "Maximum"
    }
  }

  metric_query {
    id = "throughput"

    metric {
      namespace   = "AWS/EBS"
      metric_name = "VolumeThroughputExceededCheck"
      dimensions  = { VolumeId = each.value.volume_id }
      period      = 60
      stat        = "Maximum"
    }
  }
}
