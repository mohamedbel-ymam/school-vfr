// src/api/labApi.js
import { axiosClient } from "../../../api/axios";

const TOKEN_PREFIX = "lab_attempt_token_";

const tokenKey = (attemptId) => `${TOKEN_PREFIX}${attemptId}`;

const saveAttemptToken = (attemptId, token) => {
  if (!token) return;
  localStorage.setItem(tokenKey(attemptId), token);
};

const getAttemptToken = (attemptId) => localStorage.getItem(tokenKey(attemptId)) || "";

const withAttemptToken = (attemptId) => {
  const token = getAttemptToken(attemptId);
  return token ? { "X-Attempt-Token": token } : {};
};

/* -------------------------------------------------------------------------- */
/* LAB - Public catalog                                                       */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/lab/experiments
 * params: { subject?, level?, search?, page? }
 */
export async function labListExperiments(params = {}) {
  const res = await axiosClient.get("/lab/experiments", { params });
  return res.data; // paginated
}

/**
 * GET /api/lab/experiments/:slug
 */
export async function labGetExperiment(slug) {
  const res = await axiosClient.get(`/lab/experiments/${encodeURIComponent(slug)}`);
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* LAB - Attempts (public write, secured by token for anonymous)              */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/lab/experiments/:experimentId/attempts
 * returns: { attempt_id, attempt_token|null }
 */
export async function labStartAttempt(experimentId) {
  const res = await axiosClient.post(`/lab/experiments/${experimentId}/attempts`);
  const { attempt_id, attempt_token } = res.data;

  // Store token only if anonymous attempt (backend returns token)
  if (attempt_token) saveAttemptToken(attempt_id, attempt_token);

  return res.data;
}

/**
 * GET /api/lab/attempts/:attemptId
 * Requires X-Attempt-Token if attempt is anonymous.
 */
export async function labGetAttempt(attemptId) {
  const res = await axiosClient.get(`/lab/attempts/${attemptId}`, {
    headers: withAttemptToken(attemptId),
  });
  return res.data;
}

/**
 * PATCH /api/lab/attempts/:attemptId/state
 * body: { state: { progress, parameters, measurements } }
 */
export async function labSaveState(attemptId, state) {
  const res = await axiosClient.patch(
    `/lab/attempts/${attemptId}/state`,
    { state },
    { headers: withAttemptToken(attemptId) }
  );
  return res.data;
}

/**
 * POST /api/lab/attempts/:attemptId/answers
 * body: { question_id, user_answer }
 * user_answer examples:
 *  - mcq: { selectedIndex: 1 }
 *  - numeric: { value: 0.6 }
 *  - short: { text: "La résistance" }
 */
export async function labSubmitAnswer(attemptId, questionId, userAnswer) {
  const res = await axiosClient.post(
    `/lab/attempts/${attemptId}/answers`,
    { question_id: questionId, user_answer: userAnswer },
    { headers: withAttemptToken(attemptId) }
  );
  return res.data;
}

/**
 * Optional helper if you want to forget the token client-side
 */
export function labForgetAttemptToken(attemptId) {
  localStorage.removeItem(tokenKey(attemptId));
}
