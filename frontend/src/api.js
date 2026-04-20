const API_BASE_URL = "http://localhost:4000";

export async function getExperiments() {
  const response = await fetch(`${API_BASE_URL}/experiments`);
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create experiment");
  }

  return response.json();
}

export async function updateExperimentStatus(id, status) {
  const response = await fetch(`${API_BASE_URL}/experiments/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Failed to update experiment status");
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