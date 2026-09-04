data "archive_file" "site_health" {
  type        = "zip"
  source_file = "${path.module}/lambda/site-health/index.mjs"
  output_path = "${path.module}/.terraform/site-health.zip"
}

resource "aws_cloudwatch_log_group" "site_health" {
  name              = "/aws/lambda/poker-site-health"
  retention_in_days = 7
}

resource "aws_iam_role" "site_health" {
  name = "poker-site-health"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "site_health_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.site_health.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ]
      Resource = "${aws_cloudwatch_log_group.site_health.arn}:*"
    }]
  })
}

resource "aws_lambda_function" "site_health" {
  function_name    = "poker-site-health"
  description      = "Checks that the public poker site accepts HTTPS GET requests"
  filename         = data.archive_file.site_health.output_path
  source_code_hash = data.archive_file.site_health.output_base64sha256
  role             = aws_iam_role.site_health.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      SITE_URL = "https://${var.domain}"
    }
  }

  depends_on = [aws_iam_role_policy.site_health_logs]
}

resource "aws_lambda_function_event_invoke_config" "site_health" {
  function_name                = aws_lambda_function.site_health.function_name
  maximum_retry_attempts       = 0
  maximum_event_age_in_seconds = 60
}

resource "aws_cloudwatch_event_rule" "site_health" {
  name                = "poker-site-health"
  description         = "Check the public poker site every 15 minutes"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "site_health" {
  rule      = aws_cloudwatch_event_rule.site_health.name
  target_id = "poker-site-health"
  arn       = aws_lambda_function.site_health.arn

  retry_policy {
    maximum_event_age_in_seconds = 60
    maximum_retry_attempts       = 0
  }
}

resource "aws_lambda_permission" "site_health_schedule" {
  statement_id  = "AllowEventBridgeSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.site_health.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.site_health.arn
}

resource "aws_sns_topic" "site_health" {
  name = "poker-site-health"
}

resource "aws_sns_topic_subscription" "site_health_email" {
  topic_arn = aws_sns_topic.site_health.arn
  protocol  = "email"
  endpoint  = var.site_health_notification_email
}

resource "aws_cloudwatch_metric_alarm" "site_down" {
  alarm_name          = "poker-site-down"
  alarm_description   = "The scheduled HTTPS GET request to https://${var.domain} failed."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.site_health.arn]
  ok_actions          = [aws_sns_topic.site_health.arn]

  metric_query {
    id          = "availability"
    expression  = "IF(FILL(invocations, 0) > 0, 1 - FILL(errors, 0) / FILL(invocations, 0))"
    label       = "Site availability"
    return_data = true
  }

  metric_query {
    id = "errors"

    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Errors"
      dimensions  = { FunctionName = aws_lambda_function.site_health.function_name }
      period      = 900
      stat        = "Sum"
    }
  }

  metric_query {
    id = "invocations"

    metric {
      namespace   = "AWS/Lambda"
      metric_name = "Invocations"
      dimensions  = { FunctionName = aws_lambda_function.site_health.function_name }
      period      = 900
      stat        = "Sum"
    }
  }
}
