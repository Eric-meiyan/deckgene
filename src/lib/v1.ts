/**
 * 公共 `/api/v1` API 的响应助手（见 docs/PRD.md §11.4）。
 * 与内部 dashboard 的 respData/respErr 不同：对外 API 用 { error: { code, message } }
 * 格式 + 标准 HTTP 状态码，面向第三方开发者。
 */

export function v1Json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export type V1ErrorCode =
  | 'invalid_key'
  | 'api_not_on_plan'
  | 'insufficient_credits'
  | 'rate_limit'
  | 'invalid_input'
  | 'not_found';

export function v1Error(
  code: V1ErrorCode,
  message: string,
  status: number
): Response {
  return v1Json({ error: { code, message } }, status);
}
