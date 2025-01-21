export enum ReclineAsk {
  QUESTION = "question",
  COMMAND = "command",
  COMMAND_OUTPUT = "command_output",
  COMPLETION_RESULT = "completion_result",
  TOOL = "tool",
  API_REQ_FAILED = "api_req_failed",
  RESUME_TASK = "resume_task",
  RESUME_COMPLETED_TASK = "resume_completed_task",
  MISTAKE_LIMIT_REACHED = "mistake_limit_reached",
  AUTO_APPROVAL_MAX_REQ_REACHED = "auto_approval_max_req_reached",
  BROWSER_ACTION_LAUNCH = "browser_action_launch",
  USE_MCP_SERVER = "use_mcp_server"
}
