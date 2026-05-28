const API_BASE_URL = "http://localhost:4000";

function getAuthHeaders() {
  const token = localStorage.getItem("authToken");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getExperiments() {
  const response = await fetch(`${API_BASE_URL}/experiments`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch experiments");
  }

  return response.json();
}

export async function getPublishedExperiments() {
  const response = await fetch(`${API_BASE_URL}/experiments/published`);
  if (!response.ok) {
    throw new Error("Failed to fetch published experiments");
  }
  return response.json();
}

export async function createExperiment(payload) {
  const response = await fetch(`${API_BASE_URL}/experiments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create experiment");
  }

  return response.json();
}
export async function updateExperimentStatus(id, status, moderationComment = "") {
  const response = await fetch(`${API_BASE_URL}/experiments/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status,
      moderation_comment: moderationComment,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update experiment status");
  }

  return response.json();
}

export async function createEvaluation(payload) {
  const response = await fetch(`${API_BASE_URL}/evaluations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create evaluation");
  }

  return response.json();
}

export async function getExperimentResults(id) {
  const response = await fetch(`http://localhost:4000/experiments/${id}/results`);
  if (!response.ok) {
    throw new Error("Failed to fetch results");
  }
  return response.json();
}

export async function updateExperimentCategory(id, category) {
  const response = await fetch(`${API_BASE_URL}/experiments/${id}/category`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ category }),
  });

  if (!response.ok) {
    throw new Error("Error updating experiment category");
  }

  return response.json();
}

export async function updateApprovedQuestions(id, approvedQuestions) {
  const response = await fetch(`${API_BASE_URL}/experiments/${id}/approved-questions`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      approved_custom_questions: approvedQuestions,
    }),
  });

  if (!response.ok) {
    throw new Error("Error updating approved questions");
  }

  return response.json();
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error registering user");
  }

  return response.json();
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error logging in");
  }

  return response.json();
}

export async function getPendingUsers() {
  const response = await fetch(`${API_BASE_URL}/users/pending`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch pending users");
  }

  return response.json();
}

export async function updateUserStatus(id, accountStatus) {
  const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      account_status: accountStatus,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update user status");
  }

  return response.json();
}

export async function getEvaluatedExperimentIds(userId) {
  const response = await fetch(`${API_BASE_URL}/evaluations/user/${userId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch evaluated experiments");
  }

  return response.json();
}

export async function getMyEvaluations() {
  const response = await fetch(
    `${API_BASE_URL}/evaluations/my`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.error || "Failed to fetch evaluations"
    );
  }

  return response.json();
}

export async function updateExperiment(id, payload) {
  const response = await fetch(`${API_BASE_URL}/experiments/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update experiment");
  }

  return response.json();
}